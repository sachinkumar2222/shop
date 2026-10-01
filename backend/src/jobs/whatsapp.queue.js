import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.js';

export const whatsappQueue = new Queue('whatsappQueue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,           // Only try once — avoids duplicate messages on retry
    removeOnComplete: 50,
    removeOnFail: 100,
  },
});
