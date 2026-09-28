import { Router } from 'express';
import * as batchController from '../controllers/batch.controller.js';
import { validateBatch } from '../validators/batch.validator.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// List batches for a product
router.get('/product/:productId', authenticate, batchController.getProductBatches);

// Add new batch (Admin only)
router.post('/', authenticate, authorize('ADMIN'), validateBatch, batchController.addBatch);

export default router;
