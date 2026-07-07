import { prisma } from "../../lib/prisma";

export const STOREFRONT_EVENT_TYPES = [
  "page_view",
  "product_view",
  "add_to_cart",
  "checkout_started",
] as const;

export type StorefrontEventType = (typeof STOREFRONT_EVENT_TYPES)[number];

export type TrackStorefrontEventInput = {
  sessionId: string;
  visitorId: string;
  event: StorefrontEventType;
  path?: string;
  productId?: string;
  referrer?: string;
  metadata?: Record<string, unknown>;
};

const trackEvent = async (storeId: string, input: TrackStorefrontEventInput) => {
  await prisma.storefrontEvent.create({
    data: {
      storeId,
      sessionId: input.sessionId,
      visitorId: input.visitorId,
      event: input.event,
      path: input.path ?? null,
      productId: input.productId ?? null,
      referrer: input.referrer ?? null,
      ...(input.metadata ? { metadata: input.metadata as object } : {}),
    },
  });
  return { ok: true };
};

const countUniqueVisitors = async (storeId: string, from: Date, to: Date) => {
  const rows = await prisma.storefrontEvent.findMany({
    where: { storeId, createdAt: { gte: from, lt: to } },
    select: { visitorId: true },
    distinct: ["visitorId"],
  });
  return rows.length;
};

const countEvents = async (
  storeId: string,
  from: Date,
  to: Date,
  event: StorefrontEventType,
) =>
  prisma.storefrontEvent.count({
    where: { storeId, event, createdAt: { gte: from, lt: to } },
  });

const getFunnelMetrics = async (storeId: string, from: Date, to: Date, purchases: number) => {
  const [visitors, productViews, addToCart, checkoutStarted] = await Promise.all([
    countUniqueVisitors(storeId, from, to),
    countEvents(storeId, from, to, "product_view"),
    countEvents(storeId, from, to, "add_to_cart"),
    countEvents(storeId, from, to, "checkout_started"),
  ]);

  const conversionRate =
    visitors > 0 ? Math.round((purchases / visitors) * 1000) / 10 : null;

  return {
    visitors,
    productViews,
    addToCart,
    checkoutStarted,
    purchases,
    conversionRate,
    addToCartRate: visitors > 0 ? Math.round((addToCart / visitors) * 1000) / 10 : null,
    checkoutRate: visitors > 0 ? Math.round((checkoutStarted / visitors) * 1000) / 10 : null,
  };
};

export const StorefrontEventService = {
  trackEvent,
  countUniqueVisitors,
  getFunnelMetrics,
};
