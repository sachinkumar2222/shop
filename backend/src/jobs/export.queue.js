import { Queue, Worker } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import { logger } from '../config/logger.js';

export const exportQueue = new Queue('exportQueue', {
  connection: redisConnection,
});

export const exportWorker = new Worker(
  'exportQueue',
  async (job) => {
    logger.info({ jobId: job.id, data: job.data }, 'Processing export job');
    // Implement actual export logic here later
  },
  { connection: redisConnection }
);

exportWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Export job failed');
});
