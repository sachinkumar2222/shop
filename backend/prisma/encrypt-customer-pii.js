import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import {
  assertPiiEncryptionKey,
  decryptPii,
  encryptPii,
  getCustomerPhoneLookup,
  getUserEmailLookup,
  getBarcodeLookup,
  isPiiEncrypted,
} from '../src/utils/customer-privacy.js';
import { normalizePhone } from '../src/utils/phone.js';

const prisma = new PrismaClient();
const BATCH_SIZE = 100;

const pages = async (model, args, transform) => {
  let cursor;
  let changed = 0;

  while (true) {
    const rows = await model.findMany({
      ...args,
      take: BATCH_SIZE,
      orderBy: { id: 'asc' },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (rows.length === 0) break;

    const updates = rows
      .map((row) => ({ id: row.id, data: transform(row) }))
      .filter((entry) => entry.data);

    if (updates.length > 0) {
      await prisma.$transaction(updates.map(({ id, data }) => model.update({ where: { id }, data })));
      changed += updates.length;
    }

    cursor = rows[rows.length - 1].id;
  }

  return changed;
};

const main = async () => {
  assertPiiEncryptionKey();

  // 1. Customers
  const encryptedCustomers = await pages(
    prisma.customer,
    {
      where: {
        OR: [
          { phoneLookup: null },
          { phone: { not: { startsWith: 'enc:v1:' } } },
          { name: { not: { startsWith: 'enc:v1:' } } },
          { firstName: { not: { startsWith: 'enc:v1:' } } },
        ],
      },
    },
    (customer) => {
      const currentPhone = decryptPii(customer.phone);
      const normalizedPhone = normalizePhone(currentPhone) || currentPhone;
      const phoneLookup = customer.phoneLookup || getCustomerPhoneLookup(normalizedPhone);
      const data = {};

      if (!isPiiEncrypted(customer.phone) || currentPhone !== normalizedPhone) data.phone = encryptPii(normalizedPhone);
      if (!customer.phoneLookup) data.phoneLookup = phoneLookup;
      if (customer.name !== null && !isPiiEncrypted(customer.name)) data.name = encryptPii(customer.name);
      if (customer.firstName !== null && !isPiiEncrypted(customer.firstName)) data.firstName = encryptPii(customer.firstName);

      return Object.keys(data).length ? data : null;
    }
  );

  // 2. Sales Invoices
  const encryptedInvoices = await pages(
    prisma.salesInvoice,
    {
      where: {
        OR: [
          { customerPhone: { not: { startsWith: 'enc:v1:' } } },
          { customerName: { not: { startsWith: 'enc:v1:' } } },
        ],
      },
    },
    (invoice) => {
      const data = {};
      if (invoice.customerPhone !== null && !isPiiEncrypted(invoice.customerPhone)) {
        data.customerPhone = encryptPii(invoice.customerPhone);
      }
      if (invoice.customerName !== null && !isPiiEncrypted(invoice.customerName)) {
        data.customerName = encryptPii(invoice.customerName);
      }
      return Object.keys(data).length ? data : null;
    }
  );

  // 3. Users
  const encryptedUsers = await pages(
    prisma.user,
    {
      where: {
        OR: [
          { emailLookup: null },
          { email: { not: { startsWith: 'enc:v1:' } } },
          { name: { not: { startsWith: 'enc:v1:' } } },
        ],
      },
    },
    (user) => {
      const data = {};
      const currentEmail = decryptPii(user.email);
      const normalizedEmail = String(currentEmail || '').trim().toLowerCase();
      const emailLookup = user.emailLookup || getUserEmailLookup(normalizedEmail);

      if (!isPiiEncrypted(user.email) || currentEmail !== normalizedEmail) {
        data.email = encryptPii(normalizedEmail);
      }
      if (!user.emailLookup) {
        data.emailLookup = emailLookup;
      }
      if (user.name && !isPiiEncrypted(user.name)) {
        data.name = encryptPii(user.name);
      }
      return Object.keys(data).length ? data : null;
    }
  );

  // 4. Categories
  const encryptedCategories = await pages(
    prisma.category,
    {
      where: {
        OR: [
          { nameEn: { not: { startsWith: 'enc:v1:' } } },
          { nameHi: { not: { startsWith: 'enc:v1:' } } },
        ],
      },
    },
    (cat) => {
      const data = {};
      if (cat.nameEn && !isPiiEncrypted(cat.nameEn)) data.nameEn = encryptPii(cat.nameEn);
      if (cat.nameHi && !isPiiEncrypted(cat.nameHi)) data.nameHi = encryptPii(cat.nameHi);
      return Object.keys(data).length ? data : null;
    }
  );

  // 5. Products
  const encryptedProducts = await pages(
    prisma.product,
    {
      where: {
        OR: [
          { nameEn: { not: { startsWith: 'enc:v1:' } } },
          { nameHi: { not: { startsWith: 'enc:v1:' } } },
          { barcode: { not: { startsWith: 'enc:v1:' } } },
          { barcodeLookup: null },
        ],
      },
    },
    (p) => {
      const data = {};
      if (p.nameEn && !isPiiEncrypted(p.nameEn)) data.nameEn = encryptPii(p.nameEn);
      if (p.nameHi && !isPiiEncrypted(p.nameHi)) data.nameHi = encryptPii(p.nameHi);
      if (p.barcode) {
        const rawBarcode = decryptPii(p.barcode);
        if (!isPiiEncrypted(p.barcode)) data.barcode = encryptPii(rawBarcode);
        if (!p.barcodeLookup) data.barcodeLookup = getBarcodeLookup(rawBarcode);
      }
      return Object.keys(data).length ? data : null;
    }
  );

  // 6. Product Units
  const encryptedUnits = await pages(
    prisma.productUnit,
    {
      where: {
        OR: [
          { nameHi: { not: { startsWith: 'enc:v1:' } } },
          { barcode: { not: { startsWith: 'enc:v1:' } } },
          { barcodeLookup: null },
        ],
      },
    },
    (u) => {
      const data = {};
      if (u.nameHi && !isPiiEncrypted(u.nameHi)) data.nameHi = encryptPii(u.nameHi);
      if (u.barcode) {
        const rawBarcode = decryptPii(u.barcode);
        if (!isPiiEncrypted(u.barcode)) data.barcode = encryptPii(rawBarcode);
        if (!u.barcodeLookup) data.barcodeLookup = getBarcodeLookup(rawBarcode);
      }
      return Object.keys(data).length ? data : null;
    }
  );

  // 7. Product Batches
  const encryptedBatches = await pages(
    prisma.productBatch,
    {
      where: {
        vendor: { not: { startsWith: 'enc:v1:' } },
      },
    },
    (b) => {
      const data = {};
      if (b.vendor && !isPiiEncrypted(b.vendor)) data.vendor = encryptPii(b.vendor);
      return Object.keys(data).length ? data : null;
    }
  );

  console.info(`Encryption complete. Updated:
- ${encryptedCustomers} customers
- ${encryptedInvoices} invoices
- ${encryptedUsers} users
- ${encryptedCategories} categories
- ${encryptedProducts} products
- ${encryptedUnits} units
- ${encryptedBatches} batches`);
};

main()
  .catch((err) => {
    console.error('Data encryption failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
