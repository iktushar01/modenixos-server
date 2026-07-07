import { z } from "zod";
import { STOREFRONT_EVENT_TYPES } from "./storefront-event.service";

export const analyticsRangeQuerySchema = z.object({
  range: z.enum(["today", "7d", "30d", "90d"]).optional(),
});

export const trackStorefrontEventSchema = z.object({
  sessionId: z.string().min(8).max(128),
  visitorId: z.string().min(8).max(128),
  event: z.enum(STOREFRONT_EVENT_TYPES),
  path: z.string().max(512).optional(),
  productId: z.string().uuid().optional(),
  referrer: z.string().max(512).optional(),
  metadata: z.record(z.unknown()).optional(),
});
