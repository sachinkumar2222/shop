import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeFIFO, calcLineProfit } from '../src/services/fifo.service.js';
import { calcSellingPrice, formatStock, roundMoney } from '../src/utils/unit.utils.js';
import { InsufficientStockError } from '../src/utils/AppError.js';

describe('Multi-Unit Utility Functions', () => {
  it('calcSellingPrice: computes correct selling price based on cost, factor, and margin', () => {
    // Sugar: costPerBase = 48 (since 2400 / 50 = 48)
    // 1 kg (factor 1), 25% margin => 48 * 1 * 1.25 = 60
    const priceKg = calcSellingPrice({
      costPerBase: 48,
      factorToBase: 1,
      marginPercent: 25,
    });
    expect(priceKg).toBe(60);

    // 1 bori (factor 50), 10% margin => 48 * 50 * 1.10 = 2640
    const priceBori = calcSellingPrice({
      costPerBase: 48,
      factorToBase: 50,
      marginPercent: 10,
    });
    expect(priceBori).toBe(2640);
  });

  it('calcSellingPrice: respects priceOverride if set', () => {
    const priceOverride = calcSellingPrice({
      costPerBase: 48,
      factorToBase: 50,
      marginPercent: 10,
      priceOverride: 2700,
    });
    expect(priceOverride).toBe(2700);
  });

  it('formatStock: formats stock quantities into base unit and higher unit breakdown', () => {
    const sugarProduct = {
      baseUnit: 'kg',
      units: [{ nameEn: 'bori', factorToBase: 50 }],
    };

    expect(formatStock(450, sugarProduct)).toBe('450 kg (9 bori)');
    expect(formatStock(399, sugarProduct)).toBe('399 kg (7 bori 49 kg)');
    expect(formatStock(10, sugarProduct)).toBe('10 kg');
  });

  it('formatStock: handles products without higher units', () => {
    const kapoorProduct = {
      baseUnit: 'pack',
      units: [{ nameEn: 'pack', factorToBase: 1 }],
    };
    expect(formatStock(25, kapoorProduct)).toBe('25 pack');
  });
});

describe('Sugar Multi-Unit FIFO Costing Engine', () => {
  it('Sugar scenario: Buy 9 bori @ 2400 (450 kg total stock)', async () => {
    const mockTx = {
      productBatch: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'batch-1',
            qtyRemainingBase: 450,
            costPerBase: 48,
            receivedAt: new Date('2024-01-01'),
          },
        ]),
      },
    };

    // Sell 1 kg (base qty = 1)
    const resKg = await computeFIFO('sugar-prod', 1, mockTx, 'Sugar');
    expect(resKg.allocations).toHaveLength(1);
    expect(resKg.allocations[0].qtyBase).toBe(1);
    expect(resKg.totalCogs).toBe(48);

    // Profit on 1 kg @ selling price 60 => 60 - 48 = 12
    const lineProfitKg = calcLineProfit(60, resKg.totalCogs);
    expect(lineProfitKg.lineProfit).toBe(12);

    // Sell 1 bori (base qty = 50)
    const resBori = await computeFIFO('sugar-prod', 50, mockTx, 'Sugar');
    expect(resBori.allocations[0].qtyBase).toBe(50);
    expect(resBori.totalCogs).toBe(2400);

    // Profit on 1 bori @ selling price 2640 => 2640 - 2400 = 240
    const lineProfitBori = calcLineProfit(2640, resBori.totalCogs);
    expect(lineProfitBori.lineProfit).toBe(240);
  });

  it('Multi-Batch FIFO: 2 batches (50 kg @ 48, 50 kg @ 52)', async () => {
    const mockTx = {
      productBatch: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'batch-A', qtyRemainingBase: 40, costPerBase: 48, receivedAt: new Date('2024-01-01') },
          { id: 'batch-B', qtyRemainingBase: 50, costPerBase: 52, receivedAt: new Date('2024-02-01') },
        ]),
      },
    };

    // Sell 1 bori (50 kg) after 10 kg was consumed from batch A (so 40 kg left in A)
    const { allocations, totalCogs } = await computeFIFO('sugar-prod', 50, mockTx, 'Sugar');

    expect(allocations).toHaveLength(2);
    expect(allocations[0].batchId).toBe('batch-A');
    expect(allocations[0].qtyBase).toBe(40);
    expect(allocations[1].batchId).toBe('batch-B');
    expect(allocations[1].qtyBase).toBe(10);

    // COGS = 40*48 + 10*52 = 1920 + 520 = 2440
    expect(totalCogs).toBe(2440);

    // Selling price 2640 - COGS 2440 = 200 profit
    const lineProf = calcLineProfit(2640, totalCogs);
    expect(lineProf.lineProfit).toBe(200);
  });

  it('Insufficient stock: rolls back transaction with clear error message naming product and stock', async () => {
    const mockTx = {
      productBatch: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'batch-1', qtyRemainingBase: 10, costPerBase: 48, receivedAt: new Date() },
        ]),
      },
    };

    // Try selling 50 kg when only 10 kg is available
    await expect(computeFIFO('sugar-prod', 50, mockTx, 'Sugar')).rejects.toThrow(
      'Insufficient stock for "Sugar". Available: 10 base units, Requested: 50 base units.'
    );
  });

  it('Legacy pack/piece products sell as before', async () => {
    const mockTx = {
      productBatch: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'legacy-batch', qtyRemainingBase: 20, costPerBase: 100, receivedAt: new Date() },
        ]),
      },
    };

    const { allocations, totalCogs } = await computeFIFO('legacy-prod', 3, mockTx, 'Kapoor Pack');
    expect(allocations[0].qtyBase).toBe(3);
    expect(totalCogs).toBe(300);

    const profit = calcLineProfit(450, totalCogs); // 3 x 150 = 450
    expect(profit.lineProfit).toBe(150);
  });
});
