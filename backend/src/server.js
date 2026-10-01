import 'dotenv/config';
import app from './app.js';
import { logger } from './config/logger.js';
import { PrismaClient } from '@prisma/client';
import './jobs/whatsapp.worker.js'; // Start worker process

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await prisma.$connect();
    logger.info('Connected to PostgreSQL via Prisma.');

    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();

// Handle unexpected closures
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});
