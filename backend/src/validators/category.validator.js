import { z } from 'zod';
import { ValidationError } from '../utils/AppError.js';

export const categorySchema = z.object({
  nameEn: z.string().min(1, 'English name is required'),
  nameHi: z.string().min(1, 'Hindi name is required'),
});

export const validateCategory = (req, res, next) => {
  try {
    categorySchema.parse(req.body);
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
