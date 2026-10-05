ALTER TABLE "products"
ADD COLUMN "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0;

ALTER TABLE "products"
ADD CONSTRAINT "products_discount_percent_range"
CHECK ("discount_percent" >= 0 AND "discount_percent" <= 100);
