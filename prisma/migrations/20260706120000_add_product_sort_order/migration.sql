-- Add manual sort order for catalog drag-and-drop
ALTER TABLE "products" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

UPDATE "products" AS p
SET "sortOrder" = sub.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "storeId" ORDER BY "createdAt" ASC) - 1 AS row_num
  FROM "products"
) AS sub
WHERE p.id = sub.id;

CREATE INDEX "products_storeId_sortOrder_idx" ON "products"("storeId", "sortOrder");
