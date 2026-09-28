import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ConflictError, NotFoundError, AppError } from '../utils/AppError.js';

const prisma = new PrismaClient();

export const getAllUsers = async () => {
  return await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const createUser = async ({ name, email, password, role }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError('A user with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
};

export const deleteUser = async (id, currentUserId) => {
  if (id === currentUserId) {
    throw new AppError('You cannot delete your own account', 400, 'SELF_DELETE_ERROR');
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  return await prisma.user.delete({ where: { id } });
};
