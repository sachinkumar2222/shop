import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { PrismaClient, Prisma } from '@prisma/client';

const Decimal = Prisma.Decimal;
import { runBackfill } from '../scripts/backfill-units.js';
import { checkout } from '../src/services/checkout.service.js';
import { refundInvoiceItem, cancelInvoice } from '../src/services/invoice.service.js';
import { sanitizeFinancials } from '../src/middleware/roleSanitizer.js';
import { calcSellingPrice } from '../src/utils/unit.utils.js';

const prisma = new PrismaClient();

describe('Multi-Unit & POS Mandatory Requirements Test Suite', () => {
  let category;

  beforeAll(async () => {
    // Ensure test category exists
    category = await prisma.category.findFirst();
    if (!category) {
      category = await prisma.category.create({
        data: {
          nameEn: 'Pooja Items',
          nameHi: 'पूजा सामग्री',
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Legacy Backfill preserves exact selling price using priceOverride without 25% default', async () => {
    // Create legacy product with custom price ₹145 and cost ₹100
    const legacyProd = await prisma.product.create({
      data: {
        nameEn: 'Legacy Agarbatti',
        nameHi: 'अगरबत्ती',
        categoryId: category.id,
        baseUnit: 'pack',
        batches: {
          create: {
            initialStock: 20,
            currentStock: 20,
            qtyReceivedBase: 20,
            qtyRemainingBase: 20,
            purchaseCost: 100,
            sellingPrice: 145, // Explicit non-25% price
            costPerBase: 100,
          },
        },
      },
      include: { units: true, batches: true },
    });

    // Run backfill
    await runBackfill();

    const updatedProd = await prisma.product.findUnique({
      where: { id: legacyProd.id },
      include: { units: true },
    });

    expect(updatedProd.units.length).toBeGreaterThan(0);
    const mainUnit = updatedProd.units[0];
    expect(Number(mainUnit.sellingPrice)).toBe(145);
    expect(Number(mainUnit.priceOverride)).toBe(145);

    // Cleanup
    await prisma.product.delete({ where: { id: legacyProd.id } });
  });

  it('2. Role security sanitizer strips financial details for CASHIER role', () => {
    const rawData = {
      id: 'prod-1',
      nameEn: 'Kapoor',
      costPerBase: 48.0,
      purchasePricePerUnit: 2400.0,
      marginPercent: 25.0,
      cogs: 2440.0,
      profit: 200.0,
      totalProfit: 200.0,
      units: [
        {
          id: 'unit-1',
          nameEn: 'bori',
          sellingPrice: 2640,
          marginPercent: 10.0,
          costPerBase: 48.0,
        },
      ],
    };

    const cashierView = sanitizeFinancials(rawData, 'CASHIER');
    expect(cashierView.costPerBase).toBeUndefined();
    expect(cashierView.purchasePricePerUnit).toBeUndefined();
    expect(cashierView.marginPercent).toBeUndefined();
    expect(cashierView.cogs).toBeUndefined();
    expect(cashierView.profit).toBeUndefined();
    expect(cashierView.totalProfit).toBeUndefined();
    expect(cashierView.units[0].marginPercent).toBeUndefined();
    expect(cashierView.units[0].sellingPrice).toBe(2640);

    const adminView = sanitizeFinancials(rawData, 'ADMIN');
    expect(adminView.costPerBase).toBe(48.0);
    expect(adminView.profit).toBe(200.0);
  });

  it('3. Two parallel checkout sales of remaining stock: only 1 succeeds', async () => {
    const product = await prisma.product.create({
      data: {
        nameEn: 'Limited Camphor',
        nameHi: 'सीमित कपूर',
        categoryId: category.id,
        baseUnit: 'kg',
        totalStockBase: 1.0,
        units: {
          create: {
            nameEn: '1 kg',
            factorToBase: 1.0,
            sellingPrice: 500,
            isSellUnit: true,
          },
        },
        batches: {
          create: {
            qtyReceivedBase: 1.0,
            qtyRemainingBase: 1.0,
            costPerBase: 400,
            sellingPrice: 500,
          },
        },
      },
      include: { units: true },
    });

    const unit = product.units[0];

    const checkout1 = checkout({
      idempotencyKey: `parallel-1-${Date.now()}`,
      customerName: 'Buyer 1',
      phone: '9800000001',
      paymentMode: 'CASH',
      items: [{ productId: product.id, unitId: unit.id, qtyInUnit: 1, salePrice: 500 }],
    });

    const checkout2 = checkout({
      idempotencyKey: `parallel-2-${Date.now()}`,
      customerName: 'Buyer 2',
      phone: '9800000002',
      paymentMode: 'CASH',
      items: [{ productId: product.id, unitId: unit.id, qtyInUnit: 1, salePrice: 500 }],
    });

    const results = await Promise.allSettled([checkout1, checkout2]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // Cleanup
    if (fulfilled[0]?.value?.invoice?.id) {
      await cancelInvoice(fulfilled[0].value.invoice.id);
    }
    await prisma.product.delete({ where: { id: product.id } });
  });

  it('4. Exact Decimal rounding with batch cost ₹47.3333/kg', async () => {
    const product = await prisma.product.create({
      data: {
        nameEn: 'Decimal Sugar',
        nameHi: 'चीनी',
        categoryId: category.id,
        baseUnit: 'kg',
        allowDecimalQty: true,
        totalStockBase: 10.0,
        units: {
          create: {
            nameEn: '1 kg',
            factorToBase: 1.0,
            sellingPrice: 60.0,
            isSellUnit: true,
          },
        },
        batches: {
          create: {
            qtyReceivedBase: 10.0,
            qtyRemainingBase: 10.0,
            costPerBase: 47.3333,
            sellingPrice: 60.0,
          },
        },
      },
      include: { units: true },
    });

    const unit = product.units[0];

    // Sell 0.500 kg
    const { invoice } = await checkout({
      idempotencyKey: `dec-round-${Date.now()}`,
      customerName: 'Decimal Test',
      phone: '9800000003',
      paymentMode: 'CASH',
      items: [{ productId: product.id, unitId: unit.id, qtyInUnit: 0.5, salePrice: 60 }],
    });

    expect(Number(invoice.totalAmount)).toBe(30.0);
    // COGS = 0.5 * 47.3333 = 23.66665 => roundMoney = 23.67
    // Profit = 30.00 - 23.67 = 6.33
    expect(Number(invoice.totalProfit)).toBeCloseTo(6.33, 2);

    // Cleanup
    await cancelInvoice(invoice.id);
    await prisma.product.delete({ where: { id: product.id } });
  });

  it('5. Refund restoring stock into original batches using InvoiceItemBatchAllocation', async () => {
    const product = await prisma.product.create({
      data: {
        nameEn: 'Refund Test कपूर',
        categoryId: category.id,
        baseUnit: 'kg',
        totalStockBase: 10.0,
        units: {
          create: {
            nameEn: 'kg',
            factorToBase: 1.0,
            sellingPrice: 100,
            isSellUnit: true,
          },
        },
        batches: {
          create: {
            qtyReceivedBase: 10.0,
            qtyRemainingBase: 10.0,
            costPerBase: 80,
          },
        },
      },
      include: { units: true, batches: true },
    });

    const batchId = product.batches[0].id;
    const unit = product.units[0];

    // Make sale of 3 kg
    const { invoice } = await checkout({
      idempotencyKey: `ref-test-${Date.now()}`,
      customerName: 'Refund Customer',
      phone: '9800000004',
      paymentMode: 'CASH',
      items: [{ productId: product.id, unitId: unit.id, qtyInUnit: 3, salePrice: 100 }],
    });

    // Check stock decremented to 7
    let batchAfterSale = await prisma.productBatch.findUnique({ where: { id: batchId } });
    expect(Number(batchAfterSale.qtyRemainingBase)).toBe(7.0);

    // Refund the item
    const itemId = invoice.items[0].id;
    await refundInvoiceItem(itemId);

    // Check stock restored to 10
    let batchAfterRefund = await prisma.productBatch.findUnique({ where: { id: batchId } });
    expect(Number(batchAfterRefund.qtyRemainingBase)).toBe(10.0);

    const prodAfterRefund = await prisma.product.findUnique({ where: { id: product.id } });
    expect(Number(prodAfterRefund.totalStockBase)).toBe(10.0);

    // Cleanup
    await prisma.salesInvoice.delete({ where: { id: invoice.id } });
    await prisma.product.delete({ where: { id: product.id } });
  });

  it('6. Bori sale profit = 2640 - 2440 = 200 in two-batch scenario', async () => {
    // Batch 1: 40 kg @ ₹48/kg = ₹1920
    // Batch 2: 10 kg @ ₹52/kg = ₹520
    // Total COGS for 1 bori (50 kg) = ₹2440
    // Bori sell price = ₹2640 => Profit = ₹200
    const product = await prisma.product.create({
      data: {
        nameEn: 'Two Batch Sugar',
        nameHi: 'चीनी 2 बैच',
        categoryId: category.id,
        baseUnit: 'kg',
        totalStockBase: 50.0,
        units: {
          create: {
            nameEn: 'bori',
            factorToBase: 50.0,
            sellingPrice: 2640,
            isSellUnit: true,
          },
        },
        batches: {
          create: [
            {
              qtyReceivedBase: 40.0,
              qtyRemainingBase: 40.0,
              costPerBase: 48.0,
              receivedAt: new Date(Date.now() - 10000),
            },
            {
              qtyReceivedBase: 10.0,
              qtyRemainingBase: 10.0,
              costPerBase: 52.0,
              receivedAt: new Date(),
            },
          ],
        },
      },
      include: { units: true, batches: true },
    });

    const boriUnit = product.units.find((u) => u.nameEn === 'bori');

    const { invoice } = await checkout({
      idempotencyKey: `two-batch-profit-${Date.now()}`,
      customerName: 'Bori Buyer',
      phone: '9800000005',
      paymentMode: 'CASH',
      items: [{ productId: product.id, unitId: boriUnit.id, qtyInUnit: 1, salePrice: 2640 }],
    });

    expect(Number(invoice.totalAmount)).toBe(2640.0);
    expect(Number(invoice.totalProfit)).toBe(200.0); // 2640 - 2440 = 200

  it('7. Batch edit adjusts totalStockBase and does NOT modify historical allocation COGS', async () => {
    const product = await prisma.product.create({
      data: {
        nameEn: 'Batch Edit Product',
        categoryId: category.id,
        baseUnit: 'piece',
        totalStockBase: 10,
        units: {
          create: { nameEn: 'Pcs', factorToBase: 1.0, sellingPrice: 100 },
        },
        batches: {
          create: {
            qtyReceivedBase: 10,
            qtyRemainingBase: 10,
            costPerBase: 50,
          },
        },
      },
      include: { units: true, batches: true },
    });

    const batch = product.batches[0];
    const unit = product.units[0];

    // Make sale of 2 pcs -> COGS = 100
    const { invoice } = await checkout({
      idempotencyKey: `batch-edit-sale-${Date.now()}`,
      customerName: 'Buyer',
      phone: '9800000010',
      paymentMode: 'CASH',
      items: [{ productId: product.id, unitId: unit.id, qtyInUnit: 2, salePrice: 100 }],
    });

    const historicalCogs = Number(invoice.items[0].cogs);
    expect(historicalCogs).toBe(100);

    // Now edit batch: increase purchaseQty from 10 to 15, update costPerBase to 60
    const { updateBatch } = await import('../src/services/batch.service.js');
    await updateBatch(batch.id, { purchaseQty: 15, purchasePricePerUnit: 60 });

    // Verify Product totalStockBase updated from 8 to 13 (consumed was 2, new remaining = 15 - 2 = 13)
    const updatedProd = await prisma.product.findUnique({ where: { id: product.id } });
    expect(Number(updatedProd.totalStockBase)).toBe(13);

    // Verify historical invoice item COGS remained 100
    const fetchedInvoice = await prisma.salesInvoice.findUnique({
      where: { id: invoice.id },
      include: { items: true },
    });
    expect(Number(fetchedInvoice.items[0].cogs)).toBe(100);

    // Cleanup
    await cancelInvoice(invoice.id);
    await prisma.product.delete({ where: { id: product.id } });
  });

  it('8. Multi-item cart with one insufficient line rolls back everything', async () => {
    const prodA = await prisma.product.create({
      data: {
        nameEn: 'Item A Available',
        categoryId: category.id,
        baseUnit: 'piece',
        totalStockBase: 5,
        units: { create: { nameEn: 'Pcs', factorToBase: 1.0, sellingPrice: 50 } },
        batches: { create: { qtyReceivedBase: 5, qtyRemainingBase: 5, costPerBase: 20 } },
      },
      include: { units: true },
    });

    const prodB = await prisma.product.create({
      data: {
        nameEn: 'Item B Insufficient',
        categoryId: category.id,
        baseUnit: 'piece',
        totalStockBase: 1,
        units: { create: { nameEn: 'Pcs', factorToBase: 1.0, sellingPrice: 100 } },
        batches: { create: { qtyReceivedBase: 1, qtyRemainingBase: 1, costPerBase: 50 } },
      },
      include: { units: true },
    });

    // Attempt checkout: 2 Pcs of A (ok) + 5 Pcs of B (insufficient)
    const checkoutPromise = checkout({
      idempotencyKey: `rollback-test-${Date.now()}`,
      customerName: 'Rollback Buyer',
      phone: '9800000011',
      paymentMode: 'CASH',
      items: [
        { productId: prodA.id, unitId: prodA.units[0].id, qtyInUnit: 2, salePrice: 50 },
        { productId: prodB.id, unitId: prodB.units[0].id, qtyInUnit: 5, salePrice: 100 },
      ],
    });

    await expect(checkoutPromise).rejects.toThrow(/Insufficient stock/);

    // Verify prodA stock was NOT decremented (rolled back to 5)
    const fetchedA = await prisma.product.findUnique({ where: { id: prodA.id } });
    expect(Number(fetchedA.totalStockBase)).toBe(5);

    // Cleanup
    await prisma.product.delete({ where: { id: prodA.id } });
    await prisma.product.delete({ where: { id: prodB.id } });
  });

  it('9. Batch delete with existing sales allocations returns ValidationError', async () => {
    const product = await prisma.product.create({
      data: {
        nameEn: 'Batch Delete Protect',
        categoryId: category.id,
        baseUnit: 'piece',
        totalStockBase: 10,
        units: { create: { nameEn: 'Pcs', factorToBase: 1.0, sellingPrice: 100 } },
        batches: { create: { qtyReceivedBase: 10, qtyRemainingBase: 10, costPerBase: 50 } },
      },
      include: { units: true, batches: true },
    });

    const batch = product.batches[0];
    const unit = product.units[0];

    // Make sale creating allocation
    const { invoice } = await checkout({
      idempotencyKey: `batch-del-sale-${Date.now()}`,
      customerName: 'Buyer',
      phone: '9800000012',
      paymentMode: 'CASH',
      items: [{ productId: product.id, unitId: unit.id, qtyInUnit: 1, salePrice: 100 }],
    });

    // Attempt to delete batch with allocations
    const { deleteBatch } = await import('../src/services/batch.service.js');
    await expect(deleteBatch(batch.id)).rejects.toThrow(/Cannot delete batch with existing sales allocations/);

    // Cleanup
    await cancelInvoice(invoice.id);
    await prisma.product.delete({ where: { id: product.id } });
  });

  it('10. Khata refund reverses customer lifetimeSpend balance', async () => {
    const product = await prisma.product.create({
      data: {
        nameEn: 'Khata Kapoor',
        categoryId: category.id,
        baseUnit: 'kg',
        totalStockBase: 10,
        units: { create: { nameEn: 'kg', factorToBase: 1.0, sellingPrice: 200 } },
        batches: { create: { qtyReceivedBase: 10, qtyRemainingBase: 10, costPerBase: 150 } },
      },
      include: { units: true },
    });

    const unit = product.units[0];
    const phone = '9876543210';

    // Purchase on KHATA
    const { invoice, customer } = await checkout({
      idempotencyKey: `khata-sale-${Date.now()}`,
      customerName: 'Ramesh Khata',
      phone,
      paymentMode: 'KHATA',
      items: [{ productId: product.id, unitId: unit.id, qtyInUnit: 2, salePrice: 200 }],
    });

    let custAfterSale = await prisma.customer.findUnique({ where: { phone } });
    expect(Number(custAfterSale.lifetimeSpend)).toBe(400);

    // Process refund for 1 kg
    const { processRefund } = await import('../src/services/refund.service.js');
    await processRefund({
      invoiceItemId: invoice.items[0].id,
      qtyInUnit: 1,
      idempotencyKey: `ref-khata-${Date.now()}`,
      user: { role: 'ADMIN' },
    });

    let custAfterRefund = await prisma.customer.findUnique({ where: { phone } });
    expect(Number(custAfterRefund.lifetimeSpend)).toBe(200);

    // Cleanup
    await cancelInvoice(invoice.id);
    await prisma.customer.delete({ where: { phone } });
    await prisma.product.delete({ where: { id: product.id } });
  });

  it('11. minQty and qtyStep validation (0.25 kg ok, 0.3 kg rejected)', async () => {
    const product = await prisma.product.create({
      data: {
        nameEn: 'Step Validation Sugar',
        categoryId: category.id,
        baseUnit: 'kg',
        allowDecimalQty: true,
        totalStockBase: 100,
        units: {
          create: {
            nameEn: 'Quarter Pack',
            factorToBase: 1.0,
            sellingPrice: 100,
            minQty: 0.25,
            qtyStep: 0.25,
            isSellUnit: true,
          },
        },
        batches: { create: { qtyReceivedBase: 100, qtyRemainingBase: 100, costPerBase: 80 } },
      },
      include: { units: true },
    });

    const unit = product.units[0];

    // Valid 0.25 kg step
    const validCheckout = checkout({
      idempotencyKey: `step-valid-${Date.now()}`,
      customerName: 'Valid Step',
      phone: '9800000013',
      paymentMode: 'CASH',
      items: [{ productId: product.id, unitId: unit.id, qtyInUnit: 0.25, salePrice: 100 }],
    });
    await expect(validCheckout).resolves.toBeDefined();

    // Invalid 0.30 kg step
    const invalidCheckout = checkout({
      idempotencyKey: `step-invalid-${Date.now()}`,
      customerName: 'Invalid Step',
      phone: '9800000014',
      paymentMode: 'CASH',
      items: [{ productId: product.id, unitId: unit.id, qtyInUnit: 0.3, salePrice: 100 }],
    });
    await expect(invalidCheckout).rejects.toThrow(/must be a multiple of step size/);

    // Cleanup
    const res = await validCheckout;
    if (res?.invoice?.id) await cancelInvoice(res.invoice.id);
    await prisma.product.delete({ where: { id: product.id } });
  });

  it('12. Same idempotency key with different cart request returns 409 Conflict', async () => {
    const product = await prisma.product.create({
      data: {
        nameEn: 'Hash Conflict Item',
        categoryId: category.id,
        baseUnit: 'piece',
        totalStockBase: 10,
        units: { create: { nameEn: 'Pcs', factorToBase: 1.0, sellingPrice: 50 } },
        batches: { create: { qtyReceivedBase: 10, qtyRemainingBase: 10, costPerBase: 30 } },
      },
      include: { units: true },
    });

    const unit = product.units[0];
    const key = `hash-conflict-${Date.now()}`;

    // 1st request with 1 pc
    const req1 = await checkout({
      idempotencyKey: key,
      customerName: 'Same Key',
      phone: '9800000015',
      paymentMode: 'CASH',
      items: [{ productId: product.id, unitId: unit.id, qtyInUnit: 1, salePrice: 50 }],
    });

    expect(req1.invoice.invoiceNo).toBeDefined();

    // 2nd request with SAME idempotency key but 2 pcs (different payload)
    const req2Promise = checkout({
      idempotencyKey: key,
      customerName: 'Same Key',
      phone: '9800000015',
      paymentMode: 'CASH',
      items: [{ productId: product.id, unitId: unit.id, qtyInUnit: 2, salePrice: 50 }],
    });

    await expect(req2Promise).rejects.toThrow(/Idempotency key reused with different cart request payload/);

    // Cleanup
    await cancelInvoice(req1.invoice.id);
    await prisma.product.delete({ where: { id: product.id } });
  });
});

