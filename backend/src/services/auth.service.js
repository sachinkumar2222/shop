import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AuthenticationError } from '../utils/AppError.js';
import { generateToken } from '../utils/jwt.js';
import { getUserEmailLookup, decryptUser } from '../utils/customer-privacy.js';

const prisma = new PrismaClient();

export const loginUser = async (email, password) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const emailLookup = getUserEmailLookup(normalizedEmail);

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { emailLookup },
        { email: normalizedEmail },
        { email },
      ],
    },
  });

  if (!user) {
    throw new AuthenticationError('Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AuthenticationError('Invalid email or password');
  }

  const token = generateToken(user.id, user.role);
  const decrypted = decryptUser(user);

  return {
    user: {
      id: decrypted.id,
      email: decrypted.email,
      name: decrypted.name,
      role: decrypted.role,
    },
    token,
  };
};

export const getUserById = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  return decryptUser(user);
};

