-- Phase 3: ENFORCE Migration
-- Run ONLY after code deployment and reconcile-stock shows 0 mismatches

ALTER TABLE "products" ALTER COLUMN "base_unit" SET NOT NULL;
ALTER TABLE "products" ALTER COLUMN "total_stock_base" SET NOT NULL;

ALTER TABLE "product_units" ALTER COLUMN "selling_price" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "sales_invoices_idempotency_key_key" ON "sales_invoices"("idempotency_key");
