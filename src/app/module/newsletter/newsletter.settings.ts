import { randomBytes } from "node:crypto";

export type NewsletterSettings = {
  enabled?: boolean;
  doubleOptIn?: boolean;
  welcomeEnabled?: boolean;
  welcomeSubject?: string;
  welcomeHeadline?: string;
  welcomeBody?: string;
  fromName?: string;
  replyTo?: string;
  footerText?: string;
  primaryColor?: string;
};

export const DEFAULT_NEWSLETTER_SETTINGS: NewsletterSettings = {
  enabled: true,
  doubleOptIn: false,
  welcomeEnabled: true,
  welcomeSubject: "Welcome to our newsletter",
  welcomeHeadline: "You're on the list",
  welcomeBody:
    "Thanks for subscribing. You'll be the first to hear about new arrivals, exclusive offers, and style notes.",
  footerText: "You received this email because you subscribed to our newsletter.",
  primaryColor: "#18181b",
};

export const parseNewsletterSettings = (raw: unknown): NewsletterSettings => {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_NEWSLETTER_SETTINGS };
  const input = raw as Record<string, unknown>;
  return {
    ...DEFAULT_NEWSLETTER_SETTINGS,
    ...(typeof input.enabled === "boolean" ? { enabled: input.enabled } : {}),
    ...(typeof input.doubleOptIn === "boolean" ? { doubleOptIn: input.doubleOptIn } : {}),
    ...(typeof input.welcomeEnabled === "boolean" ? { welcomeEnabled: input.welcomeEnabled } : {}),
    ...(typeof input.welcomeSubject === "string" ? { welcomeSubject: input.welcomeSubject } : {}),
    ...(typeof input.welcomeHeadline === "string" ? { welcomeHeadline: input.welcomeHeadline } : {}),
    ...(typeof input.welcomeBody === "string" ? { welcomeBody: input.welcomeBody } : {}),
    ...(typeof input.fromName === "string" ? { fromName: input.fromName } : {}),
    ...(typeof input.replyTo === "string" ? { replyTo: input.replyTo } : {}),
    ...(typeof input.footerText === "string" ? { footerText: input.footerText } : {}),
    ...(typeof input.primaryColor === "string" ? { primaryColor: input.primaryColor } : {}),
  };
};

export const generateNewsletterToken = () => randomBytes(24).toString("hex");

export const storeFrontendBase = (slug: string) =>
  `${(process.env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/$/, "")}/store/${encodeURIComponent(slug)}`;

export const buildConfirmUrl = (slug: string, token: string) =>
  `${storeFrontendBase(slug)}/newsletter/confirm?token=${encodeURIComponent(token)}`;

export const buildUnsubscribeUrl = (slug: string, token: string) =>
  `${storeFrontendBase(slug)}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
