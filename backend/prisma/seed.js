import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const categories = [
  { nameEn: 'Pooja Samagri', nameHi: 'पूजा सामग्री' },
  { nameEn: 'Agarbatti & Dhoop', nameHi: 'अगरबत्ती और धूप' },
  { nameEn: 'Diya & Deepak', nameHi: 'दीया और दीपक' },
  { nameEn: 'God Idols', nameHi: 'भगवान की मूर्तियां' },
  { nameEn: 'Laddu Gopal', nameHi: 'लड्डू गोपाल' },
  { nameEn: 'Puja Accessories', nameHi: 'पूजा के बर्तन' },
  { nameEn: 'Festival Items', nameHi: 'त्यौहार का सामान' },
  { nameEn: 'Gifts & Decor', nameHi: 'उपहार और सजावट' },
];

async function main() {
  console.log('Start seeding categories...');
  for (const category of categories) {
    const existing = await prisma.category.findFirst({
      where: { nameEn: category.nameEn },
    });
    if (!existing) {
      await prisma.category.create({
        data: category,
      });
      console.log(`Created category: ${category.nameEn}`);
    } else {
      console.log(`Category already exists: ${category.nameEn}`);
    }
  }

  // 1. Seed Admin User
  console.log('Start seeding admin user...');
  const adminEmail = 'admin@shreepooja.com';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: adminEmail,
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
  const existingCashier = await prisma.user.findUnique({
    where: { email: cashierEmail },
  });

  if (!existingCashier) {
    const hashedPassword = await bcrypt.hash('cashier123', 10);
    await prisma.user.create({
      data: {
        name: 'Store Cashier',
        email: cashierEmail,
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
