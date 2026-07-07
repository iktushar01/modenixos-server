-- CreateEnum
CREATE TYPE "NewsletterSubscriberStatus" AS ENUM ('PENDING', 'ACTIVE', 'UNSUBSCRIBED', 'BOUNCED');
CREATE TYPE "NewsletterCampaignType" AS ENUM ('PROMOTION', 'PRODUCT_SPOTLIGHT', 'NEW_ARRIVALS', 'COLLECTION', 'ANNOUNCEMENT', 'CUSTOM');
CREATE TYPE "NewsletterCampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');
CREATE TYPE "NewsletterSendStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "stores" ADD COLUMN "newsletterSettings" JSONB;

-- CreateTable
CREATE TABLE "newsletter_subscribers" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "NewsletterSubscriberStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" TEXT NOT NULL DEFAULT 'homepage',
    "customerId" TEXT,
    "confirmToken" TEXT,
    "unsubscribeToken" TEXT NOT NULL,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_campaigns" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "type" "NewsletterCampaignType" NOT NULL,
    "status" "NewsletterCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "subject" TEXT NOT NULL,
    "previewText" TEXT,
    "headline" TEXT,
    "bodyHtml" TEXT,
    "blocks" JSONB,
    "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "collectionId" TEXT,
    "couponCode" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newsletter_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_sends" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "status" "NewsletterSendStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_sends_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_confirmToken_key" ON "newsletter_subscribers"("confirmToken");
CREATE UNIQUE INDEX "newsletter_subscribers_unsubscribeToken_key" ON "newsletter_subscribers"("unsubscribeToken");
CREATE UNIQUE INDEX "newsletter_subscribers_storeId_email_key" ON "newsletter_subscribers"("storeId", "email");
CREATE INDEX "newsletter_subscribers_storeId_status_idx" ON "newsletter_subscribers"("storeId", "status");

CREATE INDEX "newsletter_campaigns_storeId_status_idx" ON "newsletter_campaigns"("storeId", "status");

CREATE UNIQUE INDEX "newsletter_sends_campaignId_subscriberId_key" ON "newsletter_sends"("campaignId", "subscriberId");
CREATE INDEX "newsletter_sends_campaignId_status_idx" ON "newsletter_sends"("campaignId", "status");

-- AddForeignKey
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "newsletter_campaigns" ADD CONSTRAINT "newsletter_campaigns_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "newsletter_campaigns" ADD CONSTRAINT "newsletter_campaigns_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "newsletter_sends" ADD CONSTRAINT "newsletter_sends_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "newsletter_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "newsletter_sends" ADD CONSTRAINT "newsletter_sends_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "newsletter_subscribers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
