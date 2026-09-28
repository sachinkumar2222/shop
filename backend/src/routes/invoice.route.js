import { Router } from 'express';
import * as invoiceController from '../controllers/invoice.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticate, invoiceController.listInvoices);
router.get('/:invoiceNo', authenticate, invoiceController.getInvoice);

export default router;
