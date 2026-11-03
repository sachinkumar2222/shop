-- AlterTable users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_lookup" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_lookup_key" ON "users"("email_lookup");
CREATE INDEX IF NOT EXISTS "users_email_lookup_idx" ON "users"("email_lookup");

-- AlterTable products
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "barcode_lookup" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "products_barcode_lookup_key" ON "products"("barcode_lookup");
CREATE INDEX IF NOT EXISTS "products_barcode_lookup_idx" ON "products"("barcode_lookup");

-- AlterTable product_units
ALTER TABLE "product_units" ADD COLUMN IF NOT EXISTS "barcode_lookup" TEXT;
CREATE INDEX IF NOT EXISTS "product_units_barcode_lookup_idx" ON "product_units"("barcode_lookup");
