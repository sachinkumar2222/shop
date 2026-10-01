import { PrismaClient } from '@prisma/client';
import { InsufficientStockError } from '../utils/AppError.js';
import { roundMoney } from '../utils/unit.utils.js';

const prisma = new PrismaClient();

/**
 * FIFO costing & allocation engine.
 *
 * Consumes stock in Base Unit from active ProductBatch records in FIFO order.
 *
 * @param {string} productId
 * @param {number} requestedQtyBase - Quantity in base unit (e.g., 50 for 1 bori, 0.5 for 500g)
 * @param {object} tx - Prisma transaction client
 * @param {string} [productName='Product'] - Optional product name for error messages
 * @returns {Promise<{ allocations: Array, totalCogs: number, avgCostPerBase: number }>}
 */
export const computeFIFO = async (productId, requestedQtyBase, tx, productName = 'Product') => {
  const reqQtyBase = Number(requestedQtyBase || 0);
  if (reqQtyBase <= 0) {
    return { allocations: [], totalCogs: 0, avgCostPerBase: 0 };
  }

  // Fetch batches in FIFO order (oldest first)
  // Check both qtyRemainingBase and fallback currentStock
  const batches = await tx.productBatch.findMany({
    where: {
      productId,
      OR: [
        { qtyRemainingBase: { gt: 0 } },
        { currentStock: { gt: 0 } },
      ],
    },
    orderBy: [
      { receivedAt: 'asc' },
      { createdAt: 'asc' },
    ],
  });

  // Calculate total available stock in Base Unit
  const totalAvailableBase = batches.reduce((sum, b) => {
    const rem = Number(b.qtyRemainingBase) > 0 ? Number(b.qtyRemainingBase) : Number(b.currentStock || 0);
    return sum + rem;
  }, 0);

  if (totalAvailableBase < reqQtyBase - 0.0001) {
    throw new InsufficientStockError(
      `Insufficient stock for "${productName}". Available: ${totalAvailableBase} base units, Requested: ${reqQtyBase} base units.`
    );
  }

  let remainingQtyBase = reqQtyBase;
  let totalCogs = 0;
  const allocations = [];

  for (const batch of batches) {
    if (remainingQtyBase <= 0) break;

    const availableInBatch = Number(batch.qtyRemainingBase) > 0
      ? Number(batch.qtyRemainingBase)
      : Number(batch.currentStock || 0);

    if (availableInBatch <= 0) continue;

    const deductQtyBase = Math.min(availableInBatch, remainingQtyBase);
    const costPerBase = Number(batch.costPerBase || 0) > 0
      ? Number(batch.costPerBase)
      : Number(batch.purchaseCost || 0);

    const lineCogs = deductQtyBase * costPerBase;
    totalCogs += lineCogs;
    remainingQtyBase -= deductQtyBase;

    allocations.push({
      batchId: batch.id,
      qtyBase: deductQtyBase,
      costPerBase: costPerBase,
      batchRemainingAfter: availableInBatch - deductQtyBase,
    });
  }

  const avgCostPerBase = reqQtyBase > 0 ? totalCogs / reqQtyBase : 0;

  return {
    allocations,
    totalCogs: roundMoney(totalCogs),
    avgCostPerBase,
  };
};

/**
 * Calculate line profit for one invoice line.
 */
export const calcLineProfit = (lineTotal, cogs) => {
  const lineProf = Number(lineTotal) - Number(cogs);
  const marginPercentage = Number(lineTotal) > 0 ? (lineProf / Number(lineTotal)) * 100 : 0;
  return {
    lineProfit: roundMoney(lineProf),
    profit: roundMoney(lineProf),
    marginPercentage: roundMoney(marginPercentage),
  };
};
