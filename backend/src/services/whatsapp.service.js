import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { logger } from '../config/logger.js';
import { generateReceiptPDF } from './receipt.service.js';
import fs from 'fs';
import path from 'path';

/**
 * Lightweight WhatsApp Service powered by @whiskeysockets/baileys
 * Pure WebSocket implementation — zero Chromium/browser overhead, uses ~35MB RAM.
 */

export let waStatus = 'INITIALIZING'; // INITIALIZING, QR_READY, CONNECTED, DISCONNECTED
export let connectedPhone = null;
export let waQrCode = null;

let sock = null;
let saveCreds = null;
const readyWaiters = new Set();

const AUTH_DIR = path.resolve(process.cwd(), '.baileys_auth');

export const initWhatsApp = async () => {
  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds: sc } = await useMultiFileAuthState(AUTH_DIR);
    saveCreds = sc;

    const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({
      version: [2, 3000, 1015901307],
      isLatest: true,
    }));
    logger.info({ version, isLatest }, 'Starting Baileys WhatsApp client');

    sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['Shree Pooja Ghar POS', 'Chrome', '1.0.0'],
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        logger.info('WhatsApp QR code ready');
        waQrCode = qr;
        waStatus = 'QR_READY';
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        logger.warn({ statusCode, shouldReconnect }, 'WhatsApp connection closed');

        waStatus = 'DISCONNECTED';
        waQrCode = null;
        connectedPhone = null;

        if (shouldReconnect) {
          logger.info('Reconnecting to WhatsApp in 5s...');
          setTimeout(initWhatsApp, 5000);
        }
      } else if (connection === 'open') {
        logger.info('✅ WhatsApp Client is connected and ready!');
        waStatus = 'CONNECTED';
        waQrCode = null;
        const rawId = sock?.user?.id || '';
        connectedPhone = rawId.split(':')[0] || rawId.split('@')[0] || null;

        for (const resolve of readyWaiters) resolve();
        readyWaiters.clear();
      }
    });
  } catch (err) {
    logger.error({ err: err.message }, 'WhatsApp Client initialization warning — server will continue running');
    waStatus = 'DISCONNECTED';
    setTimeout(initWhatsApp, 15000);
  }
};

// Start Baileys socket on startup
initWhatsApp();

export const requestPairingCode = async (phone) => {
  if (waStatus === 'CONNECTED') throw new Error('WhatsApp is already connected');
  if (!phone) throw new Error('Phone number is required');

  const cleanPhone = String(phone).replace(/\D/g, '');
  if (!cleanPhone || cleanPhone.length < 10) {
    throw new Error('Please enter a valid phone number with country code (e.g. 917877496745)');
  }

  if (!sock) {
    throw new Error('WhatsApp service is initializing. Please wait a few seconds and try again.');
  }

  logger.info(`Requesting WhatsApp pairing code for phone: ${cleanPhone}`);
  const code = await sock.requestPairingCode(cleanPhone);
  return code;
};

export const getWhatsAppStatus = () => {
  return {
    status: waStatus,
    connectedPhone,
    qr: waQrCode,
  };
};

export const logoutWhatsApp = async () => {
  if (sock) {
    try {
      await sock.logout();
    } catch (e) {
      logger.error({ err: e }, 'Error logging out from WhatsApp');
    }
    waStatus = 'DISCONNECTED';
    connectedPhone = null;
    waQrCode = null;
    try {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    } catch (e) {}
    setTimeout(initWhatsApp, 2000);
  }
};

export const waitForWhatsAppClientReady = async () => {
  if (waStatus === 'CONNECTED') return;

  logger.info('WhatsApp invoice is waiting for client to connect');
  await new Promise((resolve) => {
    const resolveWhenReady = () => {
      readyWaiters.delete(resolveWhenReady);
      resolve();
    };
    readyWaiters.add(resolveWhenReady);
    if (waStatus === 'CONNECTED') resolveWhenReady();
  });
};

const buildReceiptCaption = (invoice) => {
  const date = new Date(invoice.createdAt || Date.now()).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const lines = [
    '🙏 *Shree Pooja Ghar - Purchase invoice*',
    `Invoice: ${invoice.invoiceNo}`,
    `Date: ${date}`,
    `Customer: ${invoice.customerName || 'Guest Customer'}`,
    `Subtotal: ₹${Number(invoice.subtotal ?? invoice.totalAmount).toFixed(2)}`,
  ];
  if (Number(invoice.discountAmount || 0) > 0) {
    lines.push(`Cart discount: −₹${Number(invoice.discountAmount).toFixed(2)}`);
  }
  lines.push(
    `Total: ₹${Number(invoice.totalAmount).toFixed(2)}`,
    `Payment: ${invoice.paymentMode || 'Other'}`,
    '',
    'Your itemized PDF invoice is attached. Thank you for shopping with us.'
  );
  return lines.join('\n');
};

const getWhatsAppRecipientJid = (phone) => {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  else if (digits.length === 11 && digits.startsWith('0')) digits = `91${digits.slice(1)}`;

  if (digits.length < 11 || digits.length > 15) {
    throw new Error('Customer phone number is not a valid WhatsApp number');
  }
  return `${digits}@s.whatsapp.net`;
};

export const sendWhatsAppInvoice = async (invoice) => {
  const mockMode = process.env.NODE_ENV === 'test' || process.env.WHATSAPP_PROVIDER === 'mock';
  if (!mockMode) await waitForWhatsAppClientReady();

  logger.info({ invoiceNo: invoice.invoiceNo }, 'Generating PDF receipt...');

  let pdfBuffer;
  try {
    pdfBuffer = await generateReceiptPDF(invoice);
  } catch (err) {
    logger.error({ err, invoiceNo: invoice.invoiceNo }, 'PDF generation failed');
    throw err;
  }

  if (mockMode) {
    const filepath = path.join(process.cwd(), `receipt_${invoice.invoiceNo}.pdf`);
    fs.writeFileSync(filepath, pdfBuffer);
    logger.info({ filepath }, '[MOCK] Receipt PDF saved locally');
    return;
  }

  const recipientJid = getWhatsAppRecipientJid(invoice.customerPhone);
  const caption = buildReceiptCaption(invoice);
  const safeBuffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);

  await sock.sendMessage(recipientJid, {
    document: safeBuffer,
    mimetype: 'application/pdf',
    fileName: `Invoice_${invoice.invoiceNo}.pdf`,
    caption,
  });

  logger.info({ invoiceNo: invoice.invoiceNo, recipientJid }, '✅ WhatsApp invoice PDF sent successfully');
};
