-- AlterTable
ALTER TABLE "orders" ADD COLUMN "customerId" TEXT;
ALTER TABLE "orders" ADD COLUMN "invoiceNumber" TEXT;
ALTER TABLE "orders" ADD COLUMN "statusHistory" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "stores" ADD COLUMN "payments" JSONB;

-- CreateIndex
CREATE INDEX "orders_customerId_idx" ON "orders"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_storeId_invoiceNumber_key" ON "orders"("storeId", "invoiceNumber");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
