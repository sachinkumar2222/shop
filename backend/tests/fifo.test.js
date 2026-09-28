import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeFIFO, calcLineProfit } from '../src/services/fifo.service.js';
import { InsufficientStockError } from '../src/utils/AppError.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeTx = (batches) => ({
  productBatch: {
    findMany: vi.fn().mockResolvedValue(batches),
  },
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('FIFO Engine — computeFIFO', () => {
  it('single batch: deducts correct quantity and cost', async () => {
    const tx = makeTx([
      { id: 'batch-1', currentStock: 20, purchaseCost: '100.00', createdAt: new Date('2024-01-01') },
    ]);

    const { batchDeductions, totalCost, unitCost } = await computeFIFO('prod-1', 5, tx);

    expect(batchDeductions).toHaveLength(1);
    expect(batchDeductions[0].batchId).toBe('batch-1');
    expect(batchDeductions[0].deductQty).toBe(5);
    expect(totalCost).toBe(500);
    expect(unitCost).toBe(100);
  });

  it('multi-batch FIFO: consumes oldest batch first', async () => {
    const tx = makeTx([
      { id: 'batch-A', currentStock: 10, purchaseCost: '100.00', createdAt: new Date('2024-01-01') },
      { id: 'batch-B', currentStock: 20, purchaseCost: '120.00', createdAt: new Date('2024-02-01') },
    ]);

    // Buy 15 units → 10 from batch-A + 5 from batch-B
    const { batchDeductions, totalCost, unitCost } = await computeFIFO('prod-1', 15, tx);

    expect(batchDeductions).toHaveLength(2);
    expect(batchDeductions[0].batchId).toBe('batch-A');
    expect(batchDeductions[0].deductQty).toBe(10);
    expect(batchDeductions[1].batchId).toBe('batch-B');
    expect(batchDeductions[1].deductQty).toBe(5);

    // 10×100 + 5×120 = 1000 + 600 = 1600
    expect(totalCost).toBe(1600);
    // unitCost = 1600 / 15 ≈ 106.67
    expect(unitCost).toBeCloseTo(106.67, 1);
  });

  it('throws InsufficientStockError when stock is not enough', async () => {
    const tx = makeTx([
      { id: 'batch-1', currentStock: 3, purchaseCost: '100.00', createdAt: new Date() },
    ]);

    await expect(computeFIFO('prod-1', 10, tx)).rejects.toBeInstanceOf(InsufficientStockError);
  });

  it('throws InsufficientStockError when no batches exist', async () => {
    const tx = makeTx([]);

    await expect(computeFIFO('prod-1', 1, tx)).rejects.toBeInstanceOf(InsufficientStockError);
  });
});

// ─── Profit Calculation ───────────────────────────────────────────────────────

describe('Profit Engine — calcLineProfit', () => {
  it('calculates correct line profit', () => {
    const { lineProfit, marginPercentage } = calcLineProfit(150, 100, 10);

    // profit = (150 - 100) × 10 = 500
    expect(lineProfit).toBe(500);
    // margin = ((150 - 100) / 150) × 100 = 33.33%
    expect(marginPercentage).toBeCloseTo(33.33, 1);
  });

  it('returns zero profit when selling at cost', () => {
    const { lineProfit } = calcLineProfit(100, 100, 5);
    expect(lineProfit).toBe(0);
  });

  it('handles negative profit (selling below cost)', () => {
    const { lineProfit } = calcLineProfit(80, 100, 5);
    // (80 - 100) × 5 = -100
    expect(lineProfit).toBe(-100);
  });

  it('returns zero margin when selling price is 0', () => {
    const { marginPercentage } = calcLineProfit(0, 100, 1);
    expect(marginPercentage).toBe(0);
  });
});

// ─── Historical Profit Preservation ──────────────────────────────────────────

describe('Historical Profit Invariant', () => {
  it('invoice items lock the unit cost at time of sale', async () => {
    const tx = makeTx([
      { id: 'batch-1', currentStock: 10, purchaseCost: '100.00', createdAt: new Date() },
    ]);

    const { unitCost } = await computeFIFO('prod-1', 3, tx);

    // unitCost must be 100 — the historical batch cost
    // Even if the product later gets a new batch at ₹200, this remains 100
    expect(unitCost).toBe(100);
  });
});
