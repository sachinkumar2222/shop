import { logger } from '../config/logger.js';

/**
 * WhatsApp Service — isolated integration layer.
 * Replace this with your actual WhatsApp provider (Meta Cloud API, Twilio, etc.)
 *
 * The receipt template is configurable — change RECEIPT_TEMPLATE below.
 */

const buildReceiptMessage = (invoice) => {
  const date = new Date(invoice.createdAt).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const itemLines = invoice.items
    .map(
      (item) =>
        `  • ${item.productName} x${item.quantity} — ₹${(Number(item.unitSalePrice) * item.quantity).toFixed(2)}`
    )
    .join('\n');

  return `🙏 *श्री पूजा घर* | Shree Pooja Ghr

📄 *Invoice:* ${invoice.invoiceNo}
📅 *Date:* ${date}
👤 *Customer:* ${invoice.customerName || 'Guest'}

*Items:*
${itemLines}

💰 *Total: ₹${Number(invoice.totalAmount).toFixed(2)}*
💳 *Payment:* ${invoice.paymentMode}

Join our VIP WhatsApp group for exclusive offers & festival discounts! 🎁

धन्यवाद! आपकी पूजा मंगलमय हो 🙏`;
};

export const sendWhatsAppInvoice = async (invoice) => {
  const provider = process.env.WHATSAPP_PROVIDER || 'meta';

  if (provider === 'mock' || process.env.NODE_ENV === 'test') {
    // Mock mode — just log
    logger.info(
      { invoiceNo: invoice.invoiceNo, phone: invoice.customerPhone },
      '[MOCK] WhatsApp receipt would be sent here'
    );
    return;
  }

  if (provider === 'meta') {
    await sendViaMetaCloudAPI(invoice);
  } else {
    throw new Error(`Unsupported WhatsApp provider: ${provider}`);
  }
};

const sendViaMetaCloudAPI = async (invoice) => {
  const { WHATSAPP_API_URL, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID } =
    process.env;

  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    logger.warn('WhatsApp credentials not configured — skipping send');
    return;
  }

  const message = buildReceiptMessage(invoice);
  const phone = invoice.customerPhone.replace('+', '');

  const payload = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'text',
    text: { body: message },
  };

  const response = await fetch(
    `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`WhatsApp API error: ${response.status} — ${errorBody}`);
  }

  logger.info(
    { invoiceNo: invoice.invoiceNo, phone: invoice.customerPhone },
    'WhatsApp receipt sent via Meta Cloud API'
  );
};
