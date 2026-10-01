import { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/AppError.js';
import { calcSellingPrice, formatStock, roundMoney } from '../utils/unit.utils.js';
import { invalidateProductCache } from './product.service.js';

const prisma = new PrismaClient();

export const addBatch = async (data) => {
  const { productId, purchaseUnitId, purchaseQty, purchasePricePerUnit, purchaseCost, initialStock, vendor } = data;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { units: true },
  });

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  // Only units configured for purchasing can be used to receive stock.
  const configuredPurchaseUnits = product.units.filter((unit) => unit.isPurchaseUnit);
  let purchaseUnit = null;
  if (purchaseUnitId) {
    purchaseUnit = product.units.find((unit) => unit.id === purchaseUnitId);
    if (!purchaseUnit) throw new ValidationError('Selected purchase unit does not belong to this product');
    if (configuredPurchaseUnits.length > 0 && !purchaseUnit.isPurchaseUnit) {
      throw new ValidationError(`${purchaseUnit.nameEn} is not configured as a purchase unit`);
    }
  } else {
    purchaseUnit = configuredPurchaseUnits[0] || product.units[0];
  }

  const factor = purchaseUnit ? Number(purchaseUnit.factorToBase) : 1.0;
  if (factor <= 0) {
    throw new ValidationError('Unit conversion factor must be greater than 0');
  }

  // Quantities & Pricing
  const rawPurchaseQty = Number(purchaseQty ?? initialStock ?? 0);
  const rawPricePerUnit = Number(purchasePricePerUnit ?? purchaseCost ?? 0);

  if (rawPurchaseQty <= 0) {
    throw new ValidationError('Purchase quantity must be greater than 0');
  }
  if (rawPricePerUnit < 0) {
    throw new ValidationError('Purchase price cannot be negative');
  }

  const qtyReceivedBase = rawPurchaseQty * factor;
  const qtyRemainingBase = qtyReceivedBase;
  const costPerBase = rawPricePerUnit / factor;

  // Execute in transaction
  const result = await prisma.$transaction(async (tx) => {
    const batch = await tx.productBatch.create({
      data: {
        productId,
        purchaseUnitId: purchaseUnit ? purchaseUnit.id : null,
        purchaseQty: rawPurchaseQty,
        purchasePricePerUnit: rawPricePerUnit,
        qtyReceivedBase,
        qtyRemainingBase,
        costPerBase,
        purchaseCost: roundMoney(rawPricePerUnit),
        sellingPrice: roundMoney(data.sellingPrice || rawPricePerUnit),
        initialStock: Math.round(qtyReceivedBase),
        currentStock: Math.round(qtyRemainingBase),
        vendor: vendor || null,
        receivedAt: new Date(),
      },
    });

    // Update Product's totalStockBase
    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data: {
        totalStockBase: { increment: qtyReceivedBase },
      },
      include: { units: true },
    });

    await tx.auditLog.create({
      data: {
        action: 'ADD_BATCH',
        entity: 'ProductBatch',
        entityId: batch.id,
        details: {
          productId,
          purchaseUnit: purchaseUnit ? purchaseUnit.nameEn : product.baseUnit,
          purchaseQty: rawPurchaseQty,
          qtyReceivedBase,
          costPerBase,
        },
      },
    });

    // Compute suggested selling prices for all sell units of the product
    const sellUnits = (updatedProduct.units || []).filter((unit) => unit.isSellUnit);
    const suggestedPrices = sellUnits.map((u) => {
      const price = calcSellingPrice({
        costPerBase,
        factorToBase: u.factorToBase,
        marginPercent: u.marginPercent,
        priceOverride: u.priceOverride,
      });
      const unitCost = roundMoney(costPerBase * Number(u.factorToBase));
      const profitPerUnit = roundMoney(price - unitCost);

      return {
        unitId: u.id,
        nameEn: u.nameEn,
        nameHi: u.nameHi,
        factorToBase: Number(u.factorToBase),
        marginPercent: Number(u.marginPercent),
        suggestedSellingPrice: price,
        unitCost,
        profitPerUnit,
      };
    });

    return {
      batch,
      product: {
        ...updatedProduct,
        formattedStock: formatStock(updatedProduct.totalStockBase, updatedProduct),
      },
      costPerBase,
      suggestedPrices,
    };
  });

  invalidateProductCache();
  return result;
};

export const getProductBatches = async (productId) => {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new NotFoundError('Product not found');

  return await prisma.productBatch.findMany({
    where: { productId },
    orderBy: { receivedAt: 'desc' },
  });
};

export const updateBatch = async (batchId, data) => {
  const batch = await prisma.productBatch.findUnique({
    where: { id: batchId },
    include: { product: { include: { units: true } } },
  });

  if (!batch) throw new NotFoundError('Batch not found');

  const oldReceived = Number(batch.qtyReceivedBase);
  const oldRemaining = Number(batch.qtyRemainingBase);
  const consumed = oldReceived - oldRemaining;

  const purchaseUnit = batch.product.units.find((u) => u.id === (data.purchaseUnitId || batch.purchaseUnitId)) || batch.product.units[0];
  const factor = purchaseUnit ? Number(purchaseUnit.factorToBase) : 1.0;

  const newPurchaseQty = Number(data.purchaseQty ?? batch.purchaseQty ?? 0);
  const newPricePerUnit = Number(data.purchasePricePerUnit ?? batch.purchasePricePerUnit ?? 0);

  const newQtyReceivedBase = newPurchaseQty * factor;
  if (newQtyReceivedBase < consumed - 0.0001) {
    throw new ValidationError(`Cannot reduce batch received quantity below consumed stock (${consumed.toFixed(3)} base units consumed)`);
  }

  const newQtyRemainingBase = newQtyReceivedBase - consumed;
  const newCostPerBase = newPricePerUnit / factor;
  const deltaReceivedBase = newQtyReceivedBase - oldReceived;

  return await prisma.$transaction(async (tx) => {
    const updatedBatch = await tx.productBatch.update({
      where: { id: batchId },
      data: {
        purchaseQty: newPurchaseQty,
        purchasePricePerUnit: newPricePerUnit,
        qtyReceivedBase: newQtyReceivedBase,
        qtyRemainingBase: newQtyRemainingBase,
        costPerBase: newCostPerBase,
        currentStock: Math.max(0, Math.floor(newQtyRemainingBase)),
        vendor: data.vendor !== undefined ? data.vendor : batch.vendor,
      },
    });

    await tx.product.update({
      where: { id: batch.productId },
      data: {
        totalStockBase: { increment: deltaReceivedBase },
      },
    });

    if (data.confirmUnitPrices && typeof data.confirmUnitPrices === 'object') {
      for (const [unitId, price] of Object.entries(data.confirmUnitPrices)) {
        if (price > 0) {
          await tx.productUnit.update({
            where: { id: unitId },
            data: { sellingPrice: price },
          });
        }
      }
    }

    return updatedBatch;
  });
};

export const deleteBatch = async (batchId) => {
  const batch = await prisma.productBatch.findUnique({ where: { id: batchId } });
  if (!batch) throw new NotFoundError('Batch not found');

  const allocationCount = await prisma.invoiceItemBatchAllocation.count({
    where: { batchId },
  });

  if (allocationCount > 0) {
    throw new ValidationError('Cannot delete batch with existing sales allocations');
  }

  return await prisma.$transaction(async (tx) => {
    const remainingToDeduct = Number(batch.qtyRemainingBase);

    await tx.product.update({
      where: { id: batch.productId },
      data: {
        totalStockBase: { decrement: remainingToDeduct },
      },
    });

    return await tx.productBatch.delete({
      where: { id: batchId },
    });
  });
};
