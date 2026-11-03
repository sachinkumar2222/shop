import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../utils/AppError.js';
import { encryptPii, decryptCategory } from '../utils/customer-privacy.js';

const prisma = new PrismaClient();

export const getAllCategories = async () => {
  const categories = await prisma.category.findMany();
  return categories
    .map(decryptCategory)
    .sort((a, b) => (a.nameEn || '').localeCompare(b.nameEn || ''));
};

export const getCategoryById = async (id) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new NotFoundError('Category not found');
  return decryptCategory(category);
};

export const createCategory = async (data) => {
  const created = await prisma.category.create({
    data: {
      ...data,
      nameEn: encryptPii(data.nameEn),
      nameHi: encryptPii(data.nameHi),
    },
  });
  return decryptCategory(created);
};

export const updateCategory = async (id, data) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new NotFoundError('Category not found');

  const updateData = { ...data };
  if (data.nameEn !== undefined) updateData.nameEn = encryptPii(data.nameEn);
  if (data.nameHi !== undefined) updateData.nameHi = encryptPii(data.nameHi);

  const updated = await prisma.category.update({
    where: { id },
    data: updateData,
  });
  return decryptCategory(updated);
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
