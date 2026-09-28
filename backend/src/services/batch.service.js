import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../utils/AppError.js';

const prisma = new PrismaClient();

export const addBatch = async (data) => {
  // Verify product exists
  const product = await prisma.product.findUnique({ where: { id: data.productId } });
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  // Use a transaction to create the batch and log it
  const result = await prisma.$transaction(async (tx) => {
    const batch = await tx.productBatch.create({
      data: {
        productId: data.productId,
        purchaseCost: data.purchaseCost,
        sellingPrice: data.sellingPrice,
        initialStock: data.initialStock,
        currentStock: data.initialStock,
      },
    });

    await tx.auditLog.create({
      data: {
        action: 'ADD_BATCH',
        entity: 'ProductBatch',
        entityId: batch.id,
        details: { productId: data.productId, addedStock: data.initialStock },
      },
    });

    return batch;
  });

  return result;
};

export const getProductBatches = async (productId) => {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new NotFoundError('Product not found');

  return await prisma.productBatch.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
  });
};
