import z from "zod";
import { NewsletterCampaignType } from "../../lib/prisma-exports";

export const subscribeNewsletterSchema = z.object({
  email: z.string().email(),
  source: z.enum(["homepage", "footer", "checkout"]).optional(),
});

export const confirmNewsletterQuerySchema = z.object({
  token: z.string().min(16),
});

export const unsubscribeNewsletterQuerySchema = z.object({
  token: z.string().min(16),
});

export const updateNewsletterSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  doubleOptIn: z.boolean().optional(),
  welcomeEnabled: z.boolean().optional(),
  welcomeSubject: z.string().min(2).max(120).optional(),
  welcomeHeadline: z.string().min(2).max(160).optional(),
  welcomeBody: z.string().min(2).max(2000).optional(),
  fromName: z.string().max(80).optional(),
  replyTo: z.string().email().optional().nullable(),
  footerText: z.string().max(500).optional(),
  primaryColor: z.string().max(20).optional(),
});

export const createCampaignSchema = z.object({
  type: z.nativeEnum(NewsletterCampaignType),
  subject: z.string().min(2).max(160),
  previewText: z.string().max(200).optional(),
  headline: z.string().max(200).optional(),
  bodyHtml: z.string().max(10000).optional(),
  productIds: z.array(z.string().uuid()).max(24).optional(),
  collectionId: z.string().uuid().optional().nullable(),
  couponCode: z.string().max(40).optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
});

export const updateCampaignSchema = createCampaignSchema.partial();
