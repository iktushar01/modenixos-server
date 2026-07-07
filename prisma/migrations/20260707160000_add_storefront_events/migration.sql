-- CreateTable
CREATE TABLE "storefront_events" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "path" TEXT,
    "productId" TEXT,
    "referrer" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "storefront_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "storefront_events_storeId_createdAt_idx" ON "storefront_events"("storeId", "createdAt");
CREATE INDEX "storefront_events_storeId_event_createdAt_idx" ON "storefront_events"("storeId", "event", "createdAt");
CREATE INDEX "storefront_events_storeId_visitorId_idx" ON "storefront_events"("storeId", "visitorId");

-- AddForeignKey
ALTER TABLE "storefront_events" ADD CONSTRAINT "storefront_events_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
