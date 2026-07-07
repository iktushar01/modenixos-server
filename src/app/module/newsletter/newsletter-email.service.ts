import { sendEmail } from "../../utils/email";
import { prisma } from "../../lib/prisma";
import {
  buildConfirmUrl,
  buildUnsubscribeUrl,
  parseNewsletterSettings,
  storeFrontendBase,
} from "./newsletter.settings";

type StoreEmailContext = {
  brandName: string;
  slug: string;
  logo?: string | null;
  newsletterSettings?: unknown;
};

const getSettings = (store: StoreEmailContext) =>
  parseNewsletterSettings(store.newsletterSettings ?? null);

const safeSend = async (fn: () => Promise<unknown>) => {
  try {
    await fn();
  } catch (error) {
    console.error("[newsletter-email] send failed", error);
  }
};

const sendWelcomeEmail = async (
  store: StoreEmailContext,
  subscriber: { email: string; unsubscribeToken: string },
) => {
  const settings = getSettings(store);
  if (settings.welcomeEnabled === false) return;

  await safeSend(() =>
    sendEmail({
      to: subscriber.email,
      subject: settings.welcomeSubject ?? "Welcome to our newsletter",
      templateName: "newsletterWelcome",
      templateData: {
        brandName: store.brandName,
        logoUrl: store.logo,
        primaryColor: settings.primaryColor ?? "#18181b",
        headline: settings.welcomeHeadline,
        body: settings.welcomeBody,
        storeUrl: storeFrontendBase(store.slug),
        unsubscribeUrl: buildUnsubscribeUrl(store.slug, subscriber.unsubscribeToken),
        footerText: settings.footerText,
      },
    }),
  );
};

const sendConfirmEmail = async (
  store: StoreEmailContext,
  subscriber: { email: string; confirmToken: string; unsubscribeToken: string },
) => {
  const settings = getSettings(store);
  if (!subscriber.confirmToken) return;

  await safeSend(() =>
    sendEmail({
      to: subscriber.email,
      subject: `Confirm your subscription to ${store.brandName}`,
      templateName: "newsletterConfirm",
      templateData: {
        brandName: store.brandName,
        logoUrl: store.logo,
        primaryColor: settings.primaryColor ?? "#18181b",
        confirmUrl: buildConfirmUrl(store.slug, subscriber.confirmToken),
        unsubscribeUrl: buildUnsubscribeUrl(store.slug, subscriber.unsubscribeToken),
        footerText: settings.footerText,
      },
    }),
  );
};

const sendCampaignEmail = async (input: {
  store: StoreEmailContext;
  subscriberEmail: string;
  unsubscribeToken: string;
  subject: string;
  previewText?: string | null;
  headline?: string | null;
  bodyHtml?: string | null;
  products: Array<{
    id: string;
    name: string;
    price: number;
    discountPrice: number | null;
    image?: string;
    url: string;
  }>;
  couponCode?: string | null;
  ctaLabel?: string;
  ctaUrl?: string;
}) => {
  const settings = getSettings(input.store);
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  await safeSend(() =>
    sendEmail({
      to: input.subscriberEmail,
      subject: input.subject,
      templateName: "newsletterCampaign",
      templateData: {
        brandName: input.store.brandName,
        logoUrl: input.store.logo,
        primaryColor: settings.primaryColor ?? "#18181b",
        previewText: input.previewText,
        headline: input.headline,
        bodyHtml: input.bodyHtml,
        products: input.products.map((p) => ({
          name: p.name,
          image: p.image,
          url: p.url,
          price: formatPrice(
            p.discountPrice != null && p.discountPrice < p.price ? p.discountPrice : p.price,
          ),
          compareAt:
            p.discountPrice != null && p.discountPrice < p.price
              ? formatPrice(p.price)
              : null,
        })),
        couponCode: input.couponCode,
        ctaLabel: input.ctaLabel ?? "Shop now",
        ctaUrl: input.ctaUrl ?? buildUnsubscribeUrl(input.store.slug, input.unsubscribeToken).replace(/\/newsletter\/unsubscribe.*/, "/shop"),
        unsubscribeUrl: buildUnsubscribeUrl(input.store.slug, input.unsubscribeToken),
        footerText: settings.footerText,
      },
    }),
  );
};

export const NewsletterEmailService = {
  sendWelcomeEmail,
  sendConfirmEmail,
  sendCampaignEmail,
};

export const loadStoreEmailContext = async (storeId: string) => {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { brandName: true, slug: true, logo: true, newsletterSettings: true },
  });
  return store;
};
