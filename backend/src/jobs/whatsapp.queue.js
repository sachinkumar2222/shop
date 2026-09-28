// Overwrite old placeholder queue file with just the Queue (no inline worker)
import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.js';

export const whatsappQueue = new Queue('whatsappQueue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});
