import { Router } from 'express';
import * as posController from '../controllers/pos.controller.js';
import { validateCheckout } from '../validators/checkout.validator.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// POST /api/v1/pos/checkout — Both ADMIN and CASHIER can use POS
router.post('/checkout', authenticate, validateCheckout, posController.posCheckout);

export default router;
