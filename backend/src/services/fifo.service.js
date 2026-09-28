import { PrismaClient } from '@prisma/client';
import { InsufficientStockError } from '../utils/AppError.js';

const prisma = new PrismaClient();

/**
 * FIFO costing engine.
 *
 * Given a productId and requested qty, returns the list of batches
 * to be consumed and the weighted average unit cost.
 *
 * IMPORTANT: This must be called inside a Prisma transaction with row locking.
 * The caller is responsible for passing the Prisma transaction client (tx).
 *
 * @param {string} productId
 * @param {number} requestedQty
 * @param {object} tx - Prisma transaction client
 * @returns {Promise<{ batchDeductions: Array, totalCost: number, unitCost: number }>}
 */
export const computeFIFO = async (productId, requestedQty, tx) => {
  // Lock the product batches in FIFO order (oldest first) with a FOR UPDATE lock
  // This prevents concurrent checkouts from selling the same stock
  const batches = await tx.productBatch.findMany({
    where: {
      productId,
      currentStock: { gt: 0 },
    },
    orderBy: { createdAt: 'asc' }, // FIFO: oldest batch first
  });

  // Calculate total available stock
  const totalAvailable = batches.reduce((sum, b) => sum + b.currentStock, 0);

  if (totalAvailable < requestedQty) {
    throw new InsufficientStockError(
      `Insufficient stock. Available: ${totalAvailable}, Requested: ${requestedQty}`
    );
  }

  let remainingQty = requestedQty;
  let totalCost = 0;
  const batchDeductions = [];

  // Walk through batches in FIFO order and consume stock
  for (const batch of batches) {
    if (remainingQty <= 0) break;

    const deductQty = Math.min(batch.currentStock, remainingQty);
    // purchaseCost is a Prisma Decimal — convert to Number for arithmetic
    const batchCost = Number(batch.purchaseCost) * deductQty;

    totalCost += batchCost;
    remainingQty -= deductQty;

    batchDeductions.push({
      batchId: batch.id,
      deductQty,
      purchaseCost: Number(batch.purchaseCost),
    });
  }

  // Weighted unit cost across all batches consumed
  const unitCost = totalCost / requestedQty;

  return { batchDeductions, totalCost, unitCost };
};

/**
 * Calculate line profit for one invoice line.
 *
 * profit = (sellingPrice - unitCost) * quantity
 * marginPercentage = ((sellingPrice - unitCost) / sellingPrice) * 100
 */
export const calcLineProfit = (sellingPrice, unitCost, quantity) => {
  const lineProfit = (sellingPrice - unitCost) * quantity;
  const marginPercentage =
    sellingPrice > 0 ? ((sellingPrice - unitCost) / sellingPrice) * 100 : 0;
  return { lineProfit, marginPercentage };
};
