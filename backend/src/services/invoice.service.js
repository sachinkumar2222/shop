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
