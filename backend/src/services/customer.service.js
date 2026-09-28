import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const listCustomers = async ({ page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      skip,
      take: limit,
      orderBy: { lifetimeSpend: 'desc' },
    }),
    prisma.customer.count(),
  ]);
  return { customers, total, page, limit };
};

export const getCustomerByPhone = async (phone) => {
  return await prisma.customer.findUnique({
    where: { phone },
    include: {
      invoices: {
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
    },
  });
};
