import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getInvoiceById = async (id) => {
  return await prisma.salesInvoice.findUnique({
    where: { id },
    include: { items: true, customer: true },
  });
};

export const getInvoiceByNumber = async (invoiceNo) => {
  return await prisma.salesInvoice.findUnique({
    where: { invoiceNo },
    include: { items: true, customer: true },
  });
};

export const listInvoices = async ({ page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const [invoices, total] = await Promise.all([
    prisma.salesInvoice.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { name: true, phone: true } } },
    }),
    prisma.salesInvoice.count(),
  ]);
  return { invoices, total, page, limit };
};

export const markWaQueued = async (invoiceId) => {
  return await prisma.salesInvoice.update({
    where: { id: invoiceId },
    data: { waStatus: 'QUEUED' },
  });
};

export const claimWhatsAppRetry = async (invoiceId) => {
  const result = await prisma.salesInvoice.updateMany({
    where: { id: invoiceId, waStatus: { in: ['FAILED', 'PENDING'] } },
    data: { waStatus: 'QUEUED' },
  });
  return result.count === 1;
};

export const markWaSent = async (invoiceId) => {
  return await prisma.salesInvoice.update({
    where: { id: invoiceId },
    data: { waStatus: 'SENT' },
  });
};

export const markWaFailed = async (invoiceId) => {
  return await prisma.salesInvoice.update({
    where: { id: invoiceId },
    data: { waStatus: 'FAILED' },
  });
};

/**
 * Cancels an invoice completely and restores base stock to exact original batches.
 */
export const cancelInvoice = async (invoiceId) => {
  return await prisma.$transaction(async (tx) => {
    const invoice = await tx.salesInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: {
          include: { allocations: true },
        },
      },
    });

    if (!invoice) throw new Error('Invoice not found');

    // Restore stock for each line item using allocation records
    for (const item of invoice.items) {
      for (const alloc of item.allocations) {
        await tx.productBatch.update({
          where: { id: alloc.batchId },
          data: {
            qtyRemainingBase: { increment: alloc.qtyBase },
            currentStock: { increment: Math.round(Number(alloc.qtyBase)) },
          },
        });
      }

      await tx.product.update({
        where: { id: item.productId },
        data: {
          totalStockBase: { increment: item.qtyBase },
        },
      });
    }

    // Delete or mark invoice as cancelled
    return await tx.salesInvoice.delete({
      where: { id: invoiceId },
    });
  });
};

/**
 * Refunds a specific line item in an invoice and restores base stock to exact original batches.
 */
export const refundInvoiceItem = async (invoiceItemId) => {
  return await prisma.$transaction(async (tx) => {
    const item = await tx.invoiceItem.findUnique({
      where: { id: invoiceItemId },
      include: { allocations: true, invoice: true },
    });

    if (!item) throw new Error('Invoice item not found');

    for (const alloc of item.allocations) {
      await tx.productBatch.update({
        where: { id: alloc.batchId },
        data: {
          qtyRemainingBase: { increment: alloc.qtyBase },
          currentStock: { increment: Math.round(Number(alloc.qtyBase)) },
        },
      });
    }

    await tx.product.update({
      where: { id: item.productId },
      data: {
        totalStockBase: { increment: item.qtyBase },
      },
    });

    // Update invoice total amount and total profit
    await tx.salesInvoice.update({
      where: { id: item.invoiceId },
      data: {
        totalAmount: { decrement: item.lineTotal },
        totalProfit: { decrement: item.profit },
      },
    });

    return await tx.invoiceItem.delete({
      where: { id: invoiceItemId },
    });
  });
};
