-- ROLLBACK SQL Script
-- WARNING: Safe ONLY before Phase 3 (enforce) and before new multi-unit sales are conducted.

ALTER TABLE "sales_invoices" DROP COLUMN IF EXISTS "request_hash";
ALTER TABLE "sales_invoices" DROP COLUMN IF EXISTS "idempotency_key";

ALTER TABLE "product_units" DROP COLUMN IF EXISTS "price_override";
ALTER TABLE "product_units" DROP COLUMN IF EXISTS "selling_price";

ALTER TABLE "products" DROP COLUMN IF EXISTS "total_stock_base";
ALTER TABLE "products" DROP COLUMN IF EXISTS "low_stock_threshold";
ALTER TABLE "products" DROP COLUMN IF EXISTS "allow_decimal_qty";
ALTER TABLE "products" DROP COLUMN IF EXISTS "base_unit";
