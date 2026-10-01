import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function runBackfill() {
  console.log('🔄 Starting Multi-Unit Database Backfill...');

  const products = await prisma.product.findMany({
    include: {
      units: true,
      batches: true,
    },
  });

  for (const product of products) {
    const baseUnit = product.baseUnit || 'piece';

    // 1. Ensure Product has at least one default ProductUnit (factor = 1.0) preserving legacy selling price
    const latestBatch = product.batches && product.batches.length > 0 ? product.batches[product.batches.length - 1] : null;
    const legacyPrice = Number(latestBatch?.sellingPrice || 100);
    const legacyCost = Number(latestBatch?.purchaseCost || latestBatch?.costPerBase || 0);

    let derivedMargin = 0;
    if (legacyCost > 0 && legacyPrice >= legacyCost) {
      derivedMargin = ((legacyPrice - legacyCost) / legacyCost) * 100;
    }

    if (!product.units || product.units.length === 0) {
      await prisma.productUnit.create({
        data: {
          productId: product.id,
          nameEn: baseUnit,
          nameHi: baseUnit === 'piece' ? 'पीस' : baseUnit === 'pack' ? 'पैकेट' : baseUnit,
          factorToBase: 1.0,
          isPurchaseUnit: true,
          isSellUnit: true,
          marginPercent: derivedMargin,
          sellingPrice: legacyPrice,
          priceOverride: null, // Left NULL so future batch price updates take effect unless explicitly overridden
          qtyStep: product.allowDecimalQty ? 0.001 : 1.0,
          minQty: product.allowDecimalQty ? 0.001 : 1.0,
          sortOrder: 0,
        },
      });
      console.log(`✅ Backfilled default ProductUnit for product: ${product.nameEn} (${baseUnit}) with exact legacy price ₹${legacyPrice}`);
    }

    // 2. Backfill ProductBatch fields
    let totalAvailableBase = 0;
    for (const batch of product.batches) {
      const initStock = batch.initialStock || 0;
      const currStock = batch.currentStock || 0;
      const cost = Number(batch.purchaseCost || 0);

      const qtyReceived = Number(batch.qtyReceivedBase) > 0 ? Number(batch.qtyReceivedBase) : initStock;
      const qtyRemaining = Number(batch.qtyRemainingBase) > 0 ? Number(batch.qtyRemainingBase) : currStock;
      const costPerBase = Number(batch.costPerBase) > 0 ? Number(batch.costPerBase) : cost;

      await prisma.productBatch.update({
        where: { id: batch.id },
        data: {
          qtyReceivedBase: qtyReceived,
          qtyRemainingBase: qtyRemaining,
          costPerBase: costPerBase,
          purchaseQty: batch.purchaseQty ?? initStock,
          purchasePricePerUnit: batch.purchasePricePerUnit ?? cost,
        },
      });

      totalAvailableBase += qtyRemaining;
    }

    // Update product totalStockBase & baseUnit
    await prisma.product.update({
      where: { id: product.id },
      data: {
        baseUnit: baseUnit,
        totalStockBase: totalAvailableBase,
      },
    });
  }

  // 3. Backfill InvoiceItems
  const invoiceItems = await prisma.invoiceItem.findMany();
  for (const item of invoiceItems) {
    const qty = item.quantity || 1;
    const salePrice = Number(item.unitSalePrice || 0);
    const cost = Number(item.unitCost || 0);
    const lineProf = Number(item.lineProfit || 0);

    const qtyInUnit = Number(item.qtyInUnit) > 0 ? Number(item.qtyInUnit) : qty;
    const qtyBase = Number(item.qtyBase) > 0 ? Number(item.qtyBase) : qty;
    const unitPrice = Number(item.unitPrice) > 0 ? Number(item.unitPrice) : salePrice;
    const lineTotal = Number(item.lineTotal) > 0 ? Number(item.lineTotal) : salePrice * qty;
    const cogs = Number(item.cogs) > 0 ? Number(item.cogs) : cost * qty;
    const profit = Number(item.profit) !== 0 ? Number(item.profit) : lineProf;

    await prisma.invoiceItem.update({
      where: { id: item.id },
      data: {
        unitName: item.unitName || 'piece',
        factorToBase: item.factorToBase || 1.0,
        qtyInUnit: qtyInUnit,
        qtyBase: qtyBase,
        unitPrice: unitPrice,
        lineTotal: lineTotal,
        cogs: cogs,
        profit: profit,
      },
    });
  }

  console.log('🎉 Multi-Unit Backfill finished successfully.');
}

// Execute directly if run via CLI
if (process.argv[1]?.endsWith('backfill-units.js')) {
  runBackfill()
    .catch((err) => {
      console.error('❌ Backfill failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
