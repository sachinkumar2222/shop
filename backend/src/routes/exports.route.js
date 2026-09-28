import { Router } from 'express';
import * as exportController from '../controllers/export.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// GET /api/v1/exports/wsm?segment=all|high_value|recent&minSpend=500
router.get('/wsm', authenticate, authorize('ADMIN'), exportController.exportWSM);

export default router;
