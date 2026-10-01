import { z } from 'zod';
import { ValidationError } from '../utils/AppError.js';

export const batchSchema = z.object({
  productId: z.string().uuid('Invalid Product ID'),
  purchaseUnitId: z.string().uuid().optional().nullable(),
  purchaseQty: z.number().positive('Purchase quantity must be positive').optional(),
  purchasePricePerUnit: z.number().nonnegative('Purchase price cannot be negative').optional(),
  purchaseCost: z.number().nonnegative('Purchase cost cannot be negative').optional(),
  initialStock: z.number().positive('Initial stock must be positive').optional(),
  sellingPrice: z.number().nonnegative().optional(),
  vendor: z.string().optional().nullable(),
}).refine(
  (data) => (data.purchaseQty !== undefined || data.initialStock !== undefined),
  { message: 'Purchase quantity or initial stock is required' }
).refine(
  (data) => (data.purchasePricePerUnit !== undefined || data.purchaseCost !== undefined),
  { message: 'Purchase price per unit or purchase cost is required' }
);

export const validateBatch = (req, res, next) => {
  try {
    batchSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => err.message).join(', ');
      next(new ValidationError(messages));
    } else {
      next(error);
    }
  }
};
