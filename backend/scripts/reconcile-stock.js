import { PrismaClient, Prisma } from '@prisma/client';

const Decimal = Prisma.Decimal;
const prisma = new PrismaClient();

export async function auditLegacyDrift() {
  console.log('📜 Auditing Legacy Product.stock vs ProductBatch.currentStock...');
  const products = await prisma.product.findMany({ include: { batches: true } });

  let driftCount = 0;
  for (const p of products) {
    const legacyStock = p.stock || 0;
    const batchSum = p.batches.reduce((acc, b) => acc + (b.currentStock || 0), 0);
    if (legacyStock !== batchSum) {
      driftCount++;
      console.warn(`⚠️ Legacy Drift detected on "${p.nameEn}" (${p.id}): Product.stock = ${legacyStock}, Batch sum = ${batchSum}`);
    }
  }
  console.log(`📜 Legacy Audit Complete: ${driftCount} drift(s) found across ${products.length} product(s). Note: Product.stock is taken as initial source of truth during backfill.\n`);
}

export async function reconcileStock(fixMismatches = false) {
  console.log('🔍 Running Stock Reconciliation Audit...');

  const products = await prisma.product.findMany({
    include: {
      batches: true,
    },
  });

  const report = {
    totalProductsScanned: products.length,
    mismatchesFound: 0,
    details: [],
  };

  for (const product of products) {
    const totalStockBase = new Decimal(product.totalStockBase.toString());

    // Calculate sum of active batch remaining stock
    const batchStockSum = product.batches.reduce((sum, batch) => {
      return sum.plus(new Decimal(batch.qtyRemainingBase.toString()));
    }, new Decimal(0));

    if (!totalStockBase.equals(batchStockSum)) {
      report.mismatchesFound++;
      const discrepancy = totalStockBase.minus(batchStockSum);

      const entry = {
        productId: product.id,
        productName: product.nameEn,
        productStockBase: totalStockBase.toString(),
        batchStockSum: batchStockSum.toString(),
        discrepancy: discrepancy.toString(),
        fixed: false,
      };

      if (fixMismatches) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            totalStockBase: batchStockSum.toString(),
          },
        });
        entry.fixed = true;
        console.log(`⚠️ Fixed mismatch for "${product.nameEn}": totalStockBase updated from ${totalStockBase} to ${batchStockSum}`);
      } else {
        console.warn(`❌ Mismatch detected for "${product.nameEn}" (${product.id}): Product stock = ${totalStockBase}, Batches sum = ${batchStockSum}`);
      }

      report.details.push(entry);
    }
  }

  console.log(`\n📊 Reconciliation Complete: ${report.mismatchesFound} mismatch(es) found across ${report.totalProductsScanned} product(s).`);
  return report;
}

if (process.argv[1]?.endsWith('reconcile-stock.js')) {
  const shouldFix = process.argv.includes('--fix');
  reconcileStock(shouldFix)
    .catch((err) => {
      console.error('❌ Reconciliation failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
