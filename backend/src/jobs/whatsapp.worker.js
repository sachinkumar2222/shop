import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import { logger } from '../config/logger.js';
import { sendWhatsAppInvoice, broadcastProductArrival } from '../services/whatsapp.service.js';
import { getInvoiceById, markWaSent, markWaFailed } from '../services/invoice.service.js';

/**
 * WhatsApp Worker
 * Processes jobs from the whatsappQueue.
 * Handles both invoice dispatches and product arrival broadcasts.
 */
export const whatsappWorker = new Worker(
  'whatsappQueue',
  async (job) => {
    // 1. Handle Product Arrival Broadcast
    if (job.name === 'product-broadcast' || job.data?.broadcastType === 'PRODUCT_ARRIVAL' || job.data?.type === 'NEW_PRODUCT' || job.data?.type === 'NEW_BATCH') {
      const { productId, type } = job.data;
      logger.info({ jobId: job.id, productId, type }, 'Processing WhatsApp product broadcast job');
      await broadcastProductArrival({ productId, type });
      return;
    }

    // 2. Handle Invoice Dispatch
    const { invoiceId } = job.data;
    logger.info({ jobId: job.id, invoiceId }, 'Processing WhatsApp invoice job');

    const invoice = await getInvoiceById(invoiceId);
    if (!invoice) {
      logger.warn({ invoiceId }, 'Invoice not found for WhatsApp job — skipping');
      return;
    }

    if (!invoice.customerPhone) {
      logger.info({ invoiceId }, 'No customer phone — skipping WhatsApp');
      return;
    }

    await sendWhatsAppInvoice(invoice);
    await markWaSent(invoiceId);

    logger.info({ invoiceId, invoiceNo: invoice.invoiceNo }, 'WhatsApp invoice sent');
  },
  {
    connection: redisConnection,
    // One active job can wait for WhatsApp pairing without occupying every worker slot.
    concurrency: 1,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    },
  }
);

whatsappWorker.on('failed', async (job, err) => {
  logger.error({ jobId: job?.id, err }, 'WhatsApp job failed');
  if (job?.data?.invoiceId) {
    try {
      await markWaFailed(job.data.invoiceId);
    } catch (updateErr) {
      logger.error({ updateErr }, 'Failed to update WA status to FAILED');
    }
  }
});

whatsappWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'WhatsApp job completed');
});
