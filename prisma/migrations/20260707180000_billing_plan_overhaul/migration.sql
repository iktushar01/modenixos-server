-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');

-- AlterEnum
ALTER TYPE "StorePlan" ADD VALUE 'PRO_PLUS';
ALTER TYPE "StorePlan" ADD VALUE 'ULTRA';

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN "trialUsed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "subscriptions" ADD COLUMN "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY';

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "planTarget" "StorePlan";
ALTER TABLE "invoices" ADD COLUMN "billingInterval" "BillingInterval";

-- Migrate legacy Scale plan to Ultra
UPDATE "stores" SET "plan" = 'ULTRA' WHERE "plan" = 'ENTERPRISE';
UPDATE "subscriptions" SET "plan" = 'ULTRA' WHERE "plan" = 'ENTERPRISE';
