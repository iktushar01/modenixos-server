-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "CommissionBase" AS ENUM ('SUBTOTAL', 'TOTAL');

-- CreateEnum
CREATE TYPE "PlatformEarningStatus" AS ENUM ('EARNED', 'REVERSED');

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "commissionType" "CommissionType" NOT NULL DEFAULT 'PERCENT',
    "commissionValue" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "commissionBase" "CommissionBase" NOT NULL DEFAULT 'SUBTOTAL',
    "triggerStatus" "OrderStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_earnings" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "orderAmount" DOUBLE PRECISION NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "commissionAmount" DOUBLE PRECISION NOT NULL,
    "commissionType" "CommissionType" NOT NULL,
    "commissionBase" "CommissionBase" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PlatformEarningStatus" NOT NULL DEFAULT 'EARNED',
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_earnings_orderId_key" ON "platform_earnings"("orderId");

-- CreateIndex
CREATE INDEX "platform_earnings_storeId_idx" ON "platform_earnings"("storeId");

-- CreateIndex
CREATE INDEX "platform_earnings_status_idx" ON "platform_earnings"("status");

-- CreateIndex
CREATE INDEX "platform_earnings_earnedAt_idx" ON "platform_earnings"("earnedAt");

-- AddForeignKey
ALTER TABLE "platform_earnings" ADD CONSTRAINT "platform_earnings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_earnings" ADD CONSTRAINT "platform_earnings_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default platform settings
INSERT INTO "platform_settings" ("id", "isEnabled", "commissionType", "commissionValue", "commissionBase", "triggerStatus", "createdAt", "updatedAt")
VALUES ('default', true, 'PERCENT', 2.5, 'SUBTOTAL', 'CONFIRMED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
