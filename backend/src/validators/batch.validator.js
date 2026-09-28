import { z } from 'zod';
import { ValidationError } from '../utils/AppError.js';

export const batchSchema = z.object({
  productId: z.string().uuid('Invalid Product ID'),
  purchaseCost: z.number().positive('Purchase cost must be positive'),
  sellingPrice: z.number().positive('Selling price must be positive'),
  initialStock: z.number().int().positive('Initial stock must be greater than 0'),
});

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
