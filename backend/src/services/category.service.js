import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../utils/AppError.js';

const prisma = new PrismaClient();

export const getAllCategories = async () => {
  return await prisma.category.findMany({
    orderBy: { nameEn: 'asc' },
  });
};

export const getCategoryById = async (id) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new NotFoundError('Category not found');
  return category;
};

export const createCategory = async (data) => {
  return await prisma.category.create({ data });
};

export const updateCategory = async (id, data) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new NotFoundError('Category not found');

  return await prisma.category.update({
    where: { id },
    data,
  });
};

export const deleteCategory = async (id) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new NotFoundError('Category not found');

  // Check if products are attached
  const productCount = await prisma.product.count({ where: { categoryId: id } });
  if (productCount > 0) {
    throw new Error('Cannot delete category with attached products');
  }

  return await prisma.category.delete({ where: { id } });
};
