import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  assertPiiEncryptionKey,
  encryptPii,
  getUserEmailLookup,
} from '../src/utils/customer-privacy.js';

const prisma = new PrismaClient();

async function main() {
  assertPiiEncryptionKey();

  // 1. Seed Admin User
  console.log('Start seeding admin user...');
  const adminEmail = 'admin@shreepooja.com';
  const adminEmailLookup = getUserEmailLookup(adminEmail);
  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { emailLookup: adminEmailLookup },
        { email: adminEmail },
      ],
    },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        name: encryptPii('Super Admin'),
        email: encryptPii(adminEmail),
        emailLookup: adminEmailLookup,
        password: hashedPassword,
        role: 'ADMIN',
      },
    });
    console.log(`Created admin user: ${adminEmail}`);
  } else {
    console.log(`Admin user already exists: ${adminEmail}`);
  }

  // 2. Seed Cashier User
  console.log('Start seeding cashier user...');
  const cashierEmail = 'cashier@shreepooja.com';
  const cashierEmailLookup = getUserEmailLookup(cashierEmail);
  const existingCashier = await prisma.user.findFirst({
    where: {
      OR: [
        { emailLookup: cashierEmailLookup },
        { email: cashierEmail },
      ],
    },
  });

  if (!existingCashier) {
    const hashedPassword = await bcrypt.hash('cashier123', 10);
    await prisma.user.create({
      data: {
        name: encryptPii('Store Cashier'),
        email: encryptPii(cashierEmail),
        emailLookup: cashierEmailLookup,
        password: hashedPassword,
        role: 'CASHIER',
      },
    });
    console.log(`Created cashier user: ${cashierEmail}`);
  } else {
    console.log(`Cashier user already exists: ${cashierEmail}`);
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
