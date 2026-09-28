import { PrismaClient } from '@prisma/client';
import { INVOICE_PREFIX } from '../constants/index.js';

const prisma = new PrismaClient();

/**
 * Generates a unique sequential invoice number in format SPG-000001.
 * Uses PostgreSQL sequence for concurrency safety.
 * Must be called INSIDE a database transaction.
 *
 * We use a raw SQL sequence so that concurrent requests
 * never collide or generate duplicate invoice numbers.
 */
export const generateInvoiceNumber = async (tx) => {
  // Create sequence on first use (idempotent)
  await tx.$executeRawUnsafe(`
    CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;
  `);

  const result = await tx.$queryRawUnsafe(
    `SELECT nextval('invoice_seq') AS seq`
  );

  const seq = Number(result[0].seq);
  const padded = String(seq).padStart(6, '0');
  return `${INVOICE_PREFIX}-${padded}`;
};
