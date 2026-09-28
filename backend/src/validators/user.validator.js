import { z } from 'zod';
import { ValidationError } from '../utils/AppError.js';
import { USER_ROLES } from '../constants/index.js';

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum([USER_ROLES.ADMIN, USER_ROLES.CASHIER], {
    errorMap: () => ({ message: 'Role must be ADMIN or CASHIER' }),
  }),
});

export const validateCreateUser = (req, res, next) => {
  try {
    createUserSchema.parse(req.body);
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
