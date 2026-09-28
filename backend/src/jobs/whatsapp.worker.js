import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import { logger } from '../config/logger.js';
import { sendWhatsAppInvoice } from '../services/whatsapp.service.js';
import { getInvoiceById, markWaSent, markWaFailed } from '../services/invoice.service.js';

/**
 * WhatsApp Worker
 * Processes jobs from the whatsappQueue.
 * Completely isolated from checkout — invoice is already saved when this runs.
 */
export const whatsappWorker = new Worker(
  'whatsappQueue',
  async (job) => {
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
    concurrency: 5,
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
