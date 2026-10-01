-- Phase 1: EXPAND Migration
-- Add new columns safely without dropping old columns or enforcing non-null constraints

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "base_unit" VARCHAR(255) DEFAULT 'piece';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "allow_decimal_qty" BOOLEAN DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "low_stock_threshold" DECIMAL(12,3) DEFAULT 0;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "total_stock_base" DECIMAL(12,3) DEFAULT 0;

ALTER TABLE "product_units" ADD COLUMN IF NOT EXISTS "selling_price" DECIMAL(10,2) DEFAULT 0;
ALTER TABLE "product_units" ADD COLUMN IF NOT EXISTS "price_override" DECIMAL(10,2) DEFAULT NULL;

ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "idempotency_key" VARCHAR(255);
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "request_hash" VARCHAR(255);

ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "unit_name" VARCHAR(255) DEFAULT 'piece';
ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "factor_to_base" DECIMAL(12,4) DEFAULT 1.0;
ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "qty_in_unit" DECIMAL(12,3) DEFAULT 1.0;
ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "qty_base" DECIMAL(12,3) DEFAULT 1.0;
ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "refunded_qty_base" DECIMAL(12,3) DEFAULT 0.0;
ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "unit_price" DECIMAL(10,2) DEFAULT 0.0;
ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "line_total" DECIMAL(10,2) DEFAULT 0.0;
ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "cogs" DECIMAL(10,2) DEFAULT 0.0;
ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "profit" DECIMAL(10,2) DEFAULT 0.0;
