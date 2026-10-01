import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  addUpiAccount,
  getAllUpiAccounts,
  toggleUpiAccount,
  deleteUpiAccount
} from '../controllers/upi.controller.js';

const router = express.Router();

router.use(authenticate);

// Cashier and Admin can get UPI accounts
router.get('/', getAllUpiAccounts);

// Only Admins can add or toggle UPI accounts
router.post('/', authorize('ADMIN'), addUpiAccount);
router.patch('/:id/toggle', authorize('ADMIN'), toggleUpiAccount);
router.delete('/:id', authorize('ADMIN'), deleteUpiAccount);

export default router;
