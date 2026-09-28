import * as checkoutService from '../services/checkout.service.js';
import { whatsappQueue } from '../jobs/whatsapp.queue.js';
import { logger } from '../config/logger.js';

export const posCheckout = async (req, res, next) => {
  try {
    const { customerName, phone, paymentMode, items } = req.body;

    // Run the full checkout transaction
    const { invoice } = await checkoutService.checkout({
      customerName,
      phone,
      paymentMode,
      items,
    });

    // Queue WhatsApp message AFTER the DB transaction commits
    // WhatsApp failure must NEVER rollback the invoice
    try {
      await whatsappQueue.add('send-invoice', {
        invoiceId: invoice.id,
        invoiceNo: invoice.invoiceNo,
        customerPhone: invoice.customerPhone,
        customerName: invoice.customerName,
      });

      // Update wa_status to QUEUED
      // We import prisma here — fire-and-forget, don't block response
      import('../services/invoice.service.js').then(({ markWaQueued }) =>
        markWaQueued(invoice.id).catch((err) =>
          logger.error({ err }, 'Failed to update WA status to QUEUED')
        )
      );

      logger.info({ invoiceId: invoice.id }, 'WhatsApp job queued');
    } catch (waErr) {
      // Log but do NOT fail the checkout response
      logger.error({ err: waErr }, 'WhatsApp queue error — invoice still saved');
    }

    res.status(201).json({
      success: true,
      invoiceNo: invoice.invoiceNo,
      total: Number(invoice.totalAmount),
      profit: Number(invoice.totalProfit),
      waStatus: 'QUEUED',
    });
  } catch (error) {
    next(error);
  }
};
