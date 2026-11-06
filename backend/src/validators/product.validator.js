import { z } from 'zod';
import { ValidationError } from '../utils/AppError.js';

export const productSchema = z.object({
  barcode: z.string().nullable().optional(),
  nameEn: z.string().min(1, 'English name is required'),
  nameHi: z.string().nullable().optional(),
  categoryId: z.string().uuid('Invalid Category ID'),
  unit: z.string().nullable().optional(),
  baseUnit: z.string().nullable().optional(),
  minAlertQty: z.number().int().min(0, 'minAlertQty must be 0 or positive').default(0),
}).passthrough();

export const validateProduct = (req, res, next) => {
  try {
    productSchema.parse(req.body);
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
