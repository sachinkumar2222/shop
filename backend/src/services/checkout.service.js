import { PrismaClient } from '@prisma/client';
import { computeFIFO, calcLineProfit } from './fifo.service.js';
import { generateInvoiceNumber } from '../utils/invoiceNumber.js';
import { normalizePhone } from '../utils/phone.js';
import { NotFoundError, AppError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';

const prisma = new PrismaClient();

/**
 * POS Checkout — the heart of the system.
 *
 * Runs entirely inside a PostgreSQL transaction.
 *
 * Steps:
 *   1. Validate each product exists.
 *   2. Run FIFO costing for each line item.
 *   3. Verify stock is sufficient for all items (fails fast).
 *   4. Atomically deduct stock from batches.
 *   5. Generate a unique invoice number via a PG sequence.
 *   6. Create SalesInvoice + InvoiceItems with locked historical costs.
 *   7. Upsert Customer (only on successful commit).
 *
 * @param {object} params
 * @param {string} params.customerName
 * @param {string} params.phone
 * @param {string} params.paymentMode
 * @param {Array}  params.items  — [{ productId, qty, salePrice }]
 * @returns {object}  — { invoiceNo, total, profit }
 */
export const checkout = async ({ customerName, phone, paymentMode, items }) => {
  const normalizedPhone = normalizePhone(phone);

  const result = await prisma.$transaction(
    async (tx) => {
      // ─── 1. Validate products exist ───────────────────────────────────────
      const productIds = items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      if (products.length !== productIds.length) {
        const foundIds = products.map((p) => p.id);
        const missing = productIds.filter((id) => !foundIds.includes(id));
        throw new NotFoundError(`Products not found: ${missing.join(', ')}`);
      }

      const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

      // ─── 2. FIFO costing for each line item ──────────────────────────────
      const lineItems = [];
      let totalAmount = 0;
      let totalProfit = 0;

      for (const item of items) {
        const product = productMap[item.productId];
        const salePrice = Number(item.salePrice);

        // computeFIFO validates stock and returns deduction plan
        const { batchDeductions, unitCost } = await computeFIFO(
          item.productId,
          item.qty,
          tx
        );

        const { lineProfit } = calcLineProfit(salePrice, unitCost, item.qty);
        const lineTotal = salePrice * item.qty;

        totalAmount += lineTotal;
        totalProfit += lineProfit;

        lineItems.push({
          product,
          batchDeductions,
          qty: item.qty,
          unitCost,
          unitSalePrice: salePrice,
          lineProfit,
        });
      }

      // ─── 3. Atomically deduct stock from batches ──────────────────────────
      for (const line of lineItems) {
        for (const deduction of line.batchDeductions) {
          await tx.productBatch.update({
            where: { id: deduction.batchId },
            data: {
              currentStock: { decrement: deduction.deductQty },
            },
          });
        }
      }

      // ─── 4. Generate unique invoice number via PG sequence ────────────────
      const invoiceNo = await generateInvoiceNumber(tx);

      // ─── 5. Create SalesInvoice ───────────────────────────────────────────
      const invoice = await tx.salesInvoice.create({
        data: {
          invoiceNo,
          customerName,
          customerPhone: normalizedPhone,
          totalAmount,
          totalProfit,
          paymentMode,
          waStatus: 'PENDING',
          items: {
            create: lineItems.map((line) => ({
              productId: line.product.id,
              productName: line.product.nameEn,
              // Use the batchId of the primary (first) batch consumed
              batchId: line.batchDeductions[0].batchId,
              quantity: line.qty,
              unitCost: line.unitCost,
              unitSalePrice: line.unitSalePrice,
              lineProfit: line.lineProfit,
            })),
          },
        },
        include: { items: true },
      });

      // ─── Financial invariant check ────────────────────────────────────────
      const computedTotal = invoice.items.reduce(
        (sum, item) => sum + Number(item.unitSalePrice) * item.quantity,
        0
      );
      const computedProfit = invoice.items.reduce(
        (sum, item) => sum + Number(item.lineProfit),
        0
      );

      if (
        Math.abs(computedTotal - Number(invoice.totalAmount)) > 0.01 ||
        Math.abs(computedProfit - Number(invoice.totalProfit)) > 0.01
      ) {
        throw new AppError(
          'Financial invariant violation — invoice totals mismatch',
          500,
          'FINANCIAL_INVARIANT_ERROR'
        );
      }

      // ─── 6. Upsert Customer ───────────────────────────────────────────────
      let customer = null;
      if (normalizedPhone) {
        // Determine the last category from the first product purchased
        const firstProduct = lineItems[0]?.product;
        const lastCategory = firstProduct?.categoryId || null;

        customer = await tx.customer.upsert({
          where: { phone: normalizedPhone },
          update: {
            name: customerName,
            lifetimeSpend: { increment: totalAmount },
            totalOrders: { increment: 1 },
            lastPurchase: new Date(),
            lastCategory,
          },
          create: {
            phone: normalizedPhone,
            name: customerName,
            firstName: customerName?.split(' ')[0] || null,
            lifetimeSpend: totalAmount,
            totalOrders: 1,
            lastPurchase: new Date(),
            lastCategory,
          },
        });

        // Link invoice to customer
        await tx.salesInvoice.update({
          where: { id: invoice.id },
          data: { customerId: customer.id },
        });
      }

      logger.info(
        { invoiceNo, totalAmount, totalProfit },
        'Checkout completed successfully'
      );

      return { invoice, customer };
    },
    {
      // Use SERIALIZABLE isolation to prevent phantom reads during FIFO
      isolationLevel: 'Serializable',
    }
  );

  return result;
};
