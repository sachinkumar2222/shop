import { z } from 'zod';
import { ValidationError } from '../utils/AppError.js';
import { PAYMENT_MODES } from '../constants/index.js';

export const checkoutSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-().]{7,15}$/, 'Invalid phone number format'),
  paymentMode: z.enum(PAYMENT_MODES, {
    errorMap: () => ({
      message: `Payment mode must be one of: ${PAYMENT_MODES.join(', ')}`,
    }),
  }),
  items: z
    .array(
      z.object({
        productId: z.string().uuid('Invalid product ID'),
        qty: z.number().int().positive('Quantity must be a positive integer'),
        salePrice: z.number().positive('Sale price must be positive'),
      })
    )
    .min(1, 'At least one item is required'),
});

export const validateCheckout = (req, res, next) => {
  try {
    checkoutSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => e.message).join(', ');
      next(new ValidationError(messages));
    } else {
      next(error);
    }
  }
};
