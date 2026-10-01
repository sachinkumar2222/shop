import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger.js';
import { z } from 'zod';

const prisma = new PrismaClient();

const upiSchema = z.object({
  upiId: z.string().min(1, 'UPI ID is required'),
  name: z.string().min(1, 'Name is required'),
});

export const addUpiAccount = async (req, res, next) => {
  try {
    const { upiId, name } = upiSchema.parse(req.body);

    const existing = await prisma.upiAccount.findUnique({
      where: { upiId }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'UPI Account already exists'
      });
    }

    const upiAccount = await prisma.upiAccount.create({
      data: { upiId, name }
    });

    logger.info({ id: upiAccount.id }, 'UPI Account added');

    res.status(201).json({
      success: true,
      data: upiAccount
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUpiAccounts = async (req, res, next) => {
  try {
    const { activeOnly } = req.query;
    const where = {};
    if (activeOnly === 'true') {
      where.isActive = true;
    }

    const accounts = await prisma.upiAccount.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: accounts
    });
  } catch (error) {
    next(error);
  }
};

export const toggleUpiAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'isActive must be a boolean'
      });
    }

    const upiAccount = await prisma.upiAccount.update({
      where: { id },
      data: { isActive }
    });

    logger.info({ id, isActive }, 'UPI Account status toggled');

    res.json({
      success: true,
      data: upiAccount
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUpiAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await prisma.upiAccount.delete({
      where: { id }
    });

    logger.info({ id }, 'UPI Account deleted');

    res.json({
      success: true,
      message: 'UPI Account deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
