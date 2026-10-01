import { Router } from 'express';
import * as invoiceController from '../controllers/invoice.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticate, invoiceController.listInvoices);
router.post('/:invoiceNo/resend-whatsapp', authenticate, authorize('ADMIN'), invoiceController.resendWhatsAppInvoice);
router.get('/:invoiceNo', authenticate, invoiceController.getInvoice);
router.get('/:invoiceNo/receipt.pdf', authenticate, invoiceController.getInvoicePdf);
router.get('/:invoiceNo/thermal-receipt.html', authenticate, invoiceController.getThermalInvoiceHtml);
router.get('/:invoiceNo/thermal-receipt.pdf', authenticate, invoiceController.getThermalInvoicePdf);

export default router;
