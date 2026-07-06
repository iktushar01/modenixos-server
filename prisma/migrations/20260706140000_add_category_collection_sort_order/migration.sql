-- Add manual sort order for category and collection drag-and-drop
ALTER TABLE "categories" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

UPDATE "categories" AS c
SET "sortOrder" = sub.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "storeId", "parentId" ORDER BY "createdAt" ASC) - 1 AS row_num
  FROM "categories"
) AS sub
WHERE c.id = sub.id;

CREATE INDEX "categories_storeId_parentId_sortOrder_idx" ON "categories"("storeId", "parentId", "sortOrder");

ALTER TABLE "collections" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

UPDATE "collections" AS col
SET "sortOrder" = sub.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "storeId" ORDER BY "createdAt" ASC) - 1 AS row_num
  FROM "collections"
) AS sub
WHERE col.id = sub.id;

CREATE INDEX "collections_storeId_sortOrder_idx" ON "collections"("storeId", "sortOrder");
