import { StatusCodes } from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import {
  NewsletterCampaignStatus,
  NewsletterCampaignType,
  NewsletterSendStatus,
  NewsletterSubscriberStatus,
  ProductStatus,
} from "../../lib/prisma-exports";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { PLAN_LIMITS, normalizeStorePlan } from "../../../config/planLimits";
import {
  DEFAULT_NEWSLETTER_SETTINGS,
  generateNewsletterToken,
  parseNewsletterSettings,
  storeFrontendBase,
} from "./newsletter.settings";
import {
  loadStoreEmailContext,
  NewsletterEmailService,
} from "./newsletter-email.service";

const assertNewsletterEnabled = (settings: ReturnType<typeof parseNewsletterSettings>) => {
  if (settings.enabled === false) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Newsletter is disabled for this store");
  }
};

const getStoreWithSettings = async (storeId: string) => {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      brandName: true,
      slug: true,
      logo: true,
      plan: true,
      newsletterSettings: true,
    },
  });
  if (!store) throw new AppError(StatusCodes.NOT_FOUND, "Store not found");
  return store;
};

const linkCustomerIfExists = async (storeId: string, email: string) => {
  const customer = await prisma.customer.findUnique({
    where: { storeId_email: { storeId, email } },
    select: { id: true },
  });
  return customer?.id ?? null;
};

const subscribe = async (
  storeId: string,
  payload: { email: string; source?: string },
) => {
  const store = await getStoreWithSettings(storeId);
  const settings = parseNewsletterSettings(store.newsletterSettings);
  assertNewsletterEnabled(settings);

  const email = payload.email.trim().toLowerCase();
  const source = payload.source?.trim() || "homepage";

  const activeCount = await prisma.newsletterSubscriber.count({
    where: { storeId, status: { in: [NewsletterSubscriberStatus.ACTIVE, NewsletterSubscriberStatus.PENDING] } },
  });
  const maxSubscribers = PLAN_LIMITS[normalizeStorePlan(store.plan)].maxNewsletterSubscribers;
  if (activeCount >= maxSubscribers) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "This store has reached its newsletter subscriber limit. Upgrade your plan to add more.",
    );
  }

  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { storeId_email: { storeId, email } },
  });

  if (existing?.status === NewsletterSubscriberStatus.ACTIVE) {
    return { ok: true, message: "Already subscribed", requiresConfirmation: false };
  }

  const customerId = await linkCustomerIfExists(storeId, email);
  const doubleOptIn = settings.doubleOptIn === true;
  const confirmToken = doubleOptIn ? generateNewsletterToken() : null;

  const subscriber = existing
    ? await prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: {
          status: doubleOptIn ? NewsletterSubscriberStatus.PENDING : NewsletterSubscriberStatus.ACTIVE,
          source,
          customerId,
          confirmToken,
          confirmedAt: doubleOptIn ? null : new Date(),
          unsubscribedAt: null,
        },
      })
    : await prisma.newsletterSubscriber.create({
        data: {
          storeId,
          email,
          source,
          customerId,
          status: doubleOptIn ? NewsletterSubscriberStatus.PENDING : NewsletterSubscriberStatus.ACTIVE,
          confirmToken,
          confirmedAt: doubleOptIn ? null : new Date(),
        },
      });

  if (doubleOptIn && confirmToken) {
    void NewsletterEmailService.sendConfirmEmail(store, {
      email: subscriber.email,
      confirmToken,
      unsubscribeToken: subscriber.unsubscribeToken,
    });
    return { ok: true, message: "Check your inbox to confirm your subscription", requiresConfirmation: true };
  }

  void NewsletterEmailService.sendWelcomeEmail(store, subscriber);
  return { ok: true, message: "Subscribed successfully", requiresConfirmation: false };
};

const confirmSubscription = async (storeId: string, token: string) => {
  const subscriber = await prisma.newsletterSubscriber.findFirst({
    where: { storeId, confirmToken: token },
  });
  if (!subscriber) throw new AppError(StatusCodes.NOT_FOUND, "Invalid or expired confirmation link");

  if (subscriber.status === NewsletterSubscriberStatus.ACTIVE) {
    return { ok: true, message: "Already confirmed" };
  }

  const updated = await prisma.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: {
      status: NewsletterSubscriberStatus.ACTIVE,
      confirmToken: null,
      confirmedAt: new Date(),
    },
  });

  const store = await getStoreWithSettings(storeId);
  void NewsletterEmailService.sendWelcomeEmail(store, updated);
  return { ok: true, message: "Subscription confirmed" };
};

const unsubscribe = async (storeId: string, token: string) => {
  const subscriber = await prisma.newsletterSubscriber.findFirst({
    where: { storeId, unsubscribeToken: token },
  });
  if (!subscriber) throw new AppError(StatusCodes.NOT_FOUND, "Invalid unsubscribe link");

  await prisma.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: {
      status: NewsletterSubscriberStatus.UNSUBSCRIBED,
      unsubscribedAt: new Date(),
    },
  });

  return { ok: true, message: "You have been unsubscribed" };
};

const getSubscribers = async (storeId: string, query: Record<string, unknown>) => {
  return new QueryBuilder(prisma.newsletterSubscriber as any, query, {
    searchableFields: ["email"],
    filterableFields: ["status", "source"],
  })
    .where({ storeId })
    .search()
    .filter()
    .sort()
    .paginate()
    .execute();
};

const deleteSubscriber = async (storeId: string, id: string) => {
  const existing = await prisma.newsletterSubscriber.findFirst({ where: { id, storeId } });
  if (!existing) throw new AppError(StatusCodes.NOT_FOUND, "Subscriber not found");
  await prisma.newsletterSubscriber.delete({ where: { id } });
  return { ok: true };
};

const getSettings = async (storeId: string) => {
  const store = await getStoreWithSettings(storeId);
  return parseNewsletterSettings(store.newsletterSettings);
};

const updateSettings = async (storeId: string, payload: Record<string, unknown>) => {
  const current = await getSettings(storeId);
  const next = { ...current, ...payload };

  await prisma.store.update({
    where: { id: storeId },
    data: { newsletterSettings: next as object },
  });

  return next;
};

const getStats = async (storeId: string) => {
  const [active, pending, unsubscribed, campaignsSent] = await Promise.all([
    prisma.newsletterSubscriber.count({
      where: { storeId, status: NewsletterSubscriberStatus.ACTIVE },
    }),
    prisma.newsletterSubscriber.count({
      where: { storeId, status: NewsletterSubscriberStatus.PENDING },
    }),
    prisma.newsletterSubscriber.count({
      where: { storeId, status: NewsletterSubscriberStatus.UNSUBSCRIBED },
    }),
    prisma.newsletterCampaign.count({
      where: { storeId, status: NewsletterCampaignStatus.SENT },
    }),
  ]);

  return { active, pending, unsubscribed, campaignsSent };
};

const getCampaigns = async (storeId: string, query: Record<string, unknown>) => {
  return new QueryBuilder(prisma.newsletterCampaign as any, query, {
    searchableFields: ["subject", "headline"],
    filterableFields: ["status", "type"],
  })
    .where({ storeId })
    .search()
    .filter()
    .sort()
    .paginate()
    .execute();
};

const getCampaign = async (storeId: string, id: string) => {
  const campaign = await prisma.newsletterCampaign.findFirst({
    where: { id, storeId },
    include: { collection: { select: { id: true, name: true, slug: true } } },
  });
  if (!campaign) throw new AppError(StatusCodes.NOT_FOUND, "Campaign not found");
  return campaign;
};

const createCampaign = async (
  storeId: string,
  payload: {
    type: NewsletterCampaignType;
    subject: string;
    previewText?: string;
    headline?: string;
    bodyHtml?: string;
    productIds?: string[];
    collectionId?: string;
    couponCode?: string;
    scheduledAt?: string;
  },
) => {
  const store = await getStoreWithSettings(storeId);
  const sentThisMonth = await prisma.newsletterCampaign.count({
    where: {
      storeId,
      status: NewsletterCampaignStatus.SENT,
      sentAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
    },
  });
  if (sentThisMonth >= PLAN_LIMITS[normalizeStorePlan(store.plan)].maxNewsletterCampaignsPerMonth) {
    throw new AppError(StatusCodes.FORBIDDEN, "Monthly newsletter campaign limit reached for your plan");
  }

  return prisma.newsletterCampaign.create({
    data: {
      storeId,
      type: payload.type,
      status: payload.scheduledAt ? NewsletterCampaignStatus.SCHEDULED : NewsletterCampaignStatus.DRAFT,
      subject: payload.subject,
      previewText: payload.previewText ?? null,
      headline: payload.headline ?? null,
      bodyHtml: payload.bodyHtml ?? null,
      productIds: payload.productIds ?? [],
      collectionId: payload.collectionId ?? null,
      couponCode: payload.couponCode?.toUpperCase() ?? null,
      scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null,
    },
  });
};

const updateCampaign = async (
  storeId: string,
  id: string,
  payload: Partial<{
    type: NewsletterCampaignType;
    subject: string;
    previewText: string | null;
    headline: string | null;
    bodyHtml: string | null;
    productIds: string[];
    collectionId: string | null;
    couponCode: string | null;
    scheduledAt: string | null;
  }>,
) => {
  const existing = await getCampaign(storeId, id);
  if (existing.status === NewsletterCampaignStatus.SENT || existing.status === NewsletterCampaignStatus.SENDING) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Sent campaigns cannot be edited");
  }

  return prisma.newsletterCampaign.update({
    where: { id },
    data: {
      ...(payload.type !== undefined ? { type: payload.type } : {}),
      ...(payload.subject !== undefined ? { subject: payload.subject } : {}),
      ...(payload.previewText !== undefined ? { previewText: payload.previewText } : {}),
      ...(payload.headline !== undefined ? { headline: payload.headline } : {}),
      ...(payload.bodyHtml !== undefined ? { bodyHtml: payload.bodyHtml } : {}),
      ...(payload.productIds !== undefined ? { productIds: payload.productIds } : {}),
      ...(payload.collectionId !== undefined ? { collectionId: payload.collectionId } : {}),
      ...(payload.couponCode !== undefined
        ? { couponCode: payload.couponCode ? payload.couponCode.toUpperCase() : null }
        : {}),
      ...(payload.scheduledAt !== undefined
        ? {
            scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null,
            status: payload.scheduledAt
              ? NewsletterCampaignStatus.SCHEDULED
              : NewsletterCampaignStatus.DRAFT,
          }
        : {}),
    },
  });
};

const resolveCampaignProducts = async (storeId: string, campaign: {
  type: NewsletterCampaignType;
  productIds: string[];
  collectionId: string | null;
}) => {
  if (campaign.type === NewsletterCampaignType.NEW_ARRIVALS) {
    return prisma.product.findMany({
      where: { storeId, status: ProductStatus.ACTIVE },
      orderBy: { createdAt: "desc" },
      take: 4,
    });
  }

  if (campaign.collectionId) {
    return prisma.product.findMany({
      where: { storeId, status: ProductStatus.ACTIVE, collectionId: campaign.collectionId },
      take: 8,
    });
  }

  if (campaign.productIds.length) {
    return prisma.product.findMany({
      where: { storeId, id: { in: campaign.productIds }, status: ProductStatus.ACTIVE },
    });
  }

  return [];
};

const sendCampaign = async (storeId: string, campaignId: string) => {
  const store = await loadStoreEmailContext(storeId);
  if (!store) throw new AppError(StatusCodes.NOT_FOUND, "Store not found");

  const campaign = await getCampaign(storeId, campaignId);
  if (campaign.status === NewsletterCampaignStatus.SENT || campaign.status === NewsletterCampaignStatus.SENDING) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Campaign already sent or in progress");
  }

  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: { storeId, status: NewsletterSubscriberStatus.ACTIVE },
  });
  if (!subscribers.length) {
    throw new AppError(StatusCodes.BAD_REQUEST, "No active subscribers to send to");
  }

  await prisma.newsletterCampaign.update({
    where: { id: campaignId },
    data: { status: NewsletterCampaignStatus.SENDING },
  });

  const products = await resolveCampaignProducts(storeId, campaign);
  const shopUrl = `${storeFrontendBase(store.slug)}/shop`;
  let sentCount = 0;

  for (const subscriber of subscribers) {
    try {
      await NewsletterEmailService.sendCampaignEmail({
        store,
        subscriberEmail: subscriber.email,
        unsubscribeToken: subscriber.unsubscribeToken,
        subject: campaign.subject,
        previewText: campaign.previewText,
        headline: campaign.headline,
        bodyHtml: campaign.bodyHtml,
        couponCode: campaign.couponCode,
        ctaUrl: shopUrl,
        products: products.map((product) => ({
          id: product.id,
          name: product.name,
          price: product.price,
          discountPrice: product.discountPrice,
          ...(product.images[0] ? { image: product.images[0] } : {}),
          url: `${storeFrontendBase(store.slug)}/products/${product.id}`,
        })),
      });

      await prisma.newsletterSend.upsert({
        where: {
          campaignId_subscriberId: { campaignId, subscriberId: subscriber.id },
        },
        create: {
          campaignId,
          subscriberId: subscriber.id,
          status: NewsletterSendStatus.SENT,
          sentAt: new Date(),
        },
        update: {
          status: NewsletterSendStatus.SENT,
          sentAt: new Date(),
          error: null,
        },
      });
      sentCount += 1;
    } catch (error) {
      await prisma.newsletterSend.upsert({
        where: {
          campaignId_subscriberId: { campaignId, subscriberId: subscriber.id },
        },
        create: {
          campaignId,
          subscriberId: subscriber.id,
          status: NewsletterSendStatus.FAILED,
          error: error instanceof Error ? error.message : "Send failed",
        },
        update: {
          status: NewsletterSendStatus.FAILED,
          error: error instanceof Error ? error.message : "Send failed",
        },
      });
    }
  }

  return prisma.newsletterCampaign.update({
    where: { id: campaignId },
    data: {
      status: NewsletterCampaignStatus.SENT,
      sentAt: new Date(),
      recipientCount: sentCount,
    },
  });
};

const deleteCampaign = async (storeId: string, id: string) => {
  const campaign = await getCampaign(storeId, id);
  if (campaign.status === NewsletterCampaignStatus.SENDING) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Cannot delete a campaign while sending");
  }
  await prisma.newsletterCampaign.delete({ where: { id } });
  return { ok: true };
};

export const NewsletterService = {
  subscribe,
  confirmSubscription,
  unsubscribe,
  getSubscribers,
  deleteSubscriber,
  getSettings,
  updateSettings,
  getStats,
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  sendCampaign,
  deleteCampaign,
  DEFAULT_NEWSLETTER_SETTINGS,
};
