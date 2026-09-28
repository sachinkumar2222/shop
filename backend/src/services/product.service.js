import { PrismaClient } from '@prisma/client';
import { NotFoundError, ConflictError } from '../utils/AppError.js';

const prisma = new PrismaClient();

export const getAllProducts = async () => {
  const products = await prisma.product.findMany({
    include: {
      category: true,
      batches: {
        where: { currentStock: { gt: 0 } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return products.map(product => {
    const totalStock = product.batches.reduce((sum, batch) => sum + batch.currentStock, 0);
    return {
      ...product,
      totalAvailableStock: totalStock,
    };
  });
};

export const getProductById = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      batches: {
        where: { currentStock: { gt: 0 } },
      },
    },
  });
  if (!product) throw new NotFoundError('Product not found');
  
  const totalStock = product.batches.reduce((sum, batch) => sum + batch.currentStock, 0);
  return { ...product, totalAvailableStock: totalStock };
};

export const getProductByBarcode = async (barcode) => {
  const product = await prisma.product.findUnique({
    where: { barcode },
    include: {
      category: true,
      batches: {
        where: { currentStock: { gt: 0 } },
      },
    },
  });
  if (!product) throw new NotFoundError('Product not found');

  const totalStock = product.batches.reduce((sum, batch) => sum + batch.currentStock, 0);
  return { ...product, totalAvailableStock: totalStock };
};

export const getLowStockProducts = async () => {
  // We need to fetch products and then filter by stock <= minAlertQty
  const products = await prisma.product.findMany({
    include: {
      category: true,
      batches: {
        where: { currentStock: { gt: 0 } },
      },
    },
  });

  const lowStock = products.map(product => {
    const totalStock = product.batches.reduce((sum, batch) => sum + batch.currentStock, 0);
    return { ...product, totalAvailableStock: totalStock };
  }).filter(p => p.totalAvailableStock <= p.minAlertQty);

  return lowStock;
};

export const createProduct = async (data) => {
  const { barcode, nameEn, nameHi, categoryId, minAlertQty } = data;

  if (barcode) {
    const existing = await prisma.product.findUnique({ where: { barcode } });
    if (existing) throw new ConflictError('Product with this barcode already exists');
  }

  return await prisma.product.create({
    data: {
      nameEn,
      nameHi: nameHi || null,
      categoryId,
      barcode: barcode || null,
      minAlertQty: minAlertQty ? parseInt(minAlertQty) : 0,
    },
  });
};

export const updateProduct = async (id, data) => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new NotFoundError('Product not found');

  if (data.barcode && data.barcode !== product.barcode) {
    const existing = await prisma.product.findUnique({ where: { barcode: data.barcode } });
    if (existing) throw new ConflictError('Product with this barcode already exists');
  }

  const updateData = {};
  if (data.nameEn !== undefined) updateData.nameEn = data.nameEn;
  if (data.nameHi !== undefined) updateData.nameHi = data.nameHi;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.barcode !== undefined) updateData.barcode = data.barcode || null;
  if (data.minAlertQty !== undefined) updateData.minAlertQty = parseInt(data.minAlertQty);

  return await prisma.product.update({
    where: { id },
    data: updateData,
  });
};
