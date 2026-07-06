-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN "billingProvider" TEXT;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "provider" TEXT;
ALTER TABLE "invoices" ADD COLUMN "transactionId" TEXT;
ALTER TABLE "invoices" ADD COLUMN "validationId" TEXT;
ALTER TABLE "invoices" ADD COLUMN "gatewayResponse" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "invoices_transactionId_key" ON "invoices"("transactionId");
