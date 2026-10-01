-- Phase 2: BACKFILL Migration
-- Populate product total_stock_base from current product stock
UPDATE "products" SET "total_stock_base" = "stock" WHERE "total_stock_base" = 0;
UPDATE "products" SET "low_stock_threshold" = "min_alert_qty" WHERE "low_stock_threshold" = 0;

-- Backfill ProductBatch base quantities
UPDATE "product_batches" SET "qty_received_base" = "initial_stock" WHERE "qty_received_base" = 0;
UPDATE "product_batches" SET "qty_remaining_base" = "current_stock" WHERE "qty_remaining_base" = 0;
UPDATE "product_batches" SET "cost_per_base" = "purchase_cost" WHERE "cost_per_base" = 0;

-- Backfill ProductUnit selling_price from latest batch selling_price (leave price_override NULL)
UPDATE "product_units" pu
SET "selling_price" = COALESCE((
  SELECT pb.selling_price
  FROM product_batches pb
  WHERE pb.product_id = pu.product_id
  ORDER BY pb.received_at DESC
  LIMIT 1
), 0)
WHERE pu.selling_price = 0;

-- Copy legacy InvoiceItem cogs & profit directly without recomputing
UPDATE "invoice_items"
SET
  "qty_in_unit" = "quantity",
  "qty_base" = "quantity",
  "unit_price" = "unit_sale_price",
  "line_total" = "unit_sale_price" * "quantity",
  "cogs" = "unit_cost" * "quantity",
  "profit" = "line_profit"
WHERE "line_total" = 0 AND "quantity" > 0;
