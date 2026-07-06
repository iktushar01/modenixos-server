import { StatusCodes } from "http-status-codes";
import Stripe from "stripe";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { InvoiceStatus, StorePlan, SubscriptionStatus } from "../../lib/prisma-exports";
import { PLAN_LIMITS, PLAN_MRR } from "../../../config/planLimits";
import { isStripeConfigured, stripe, stripeConfig, resolveProMonthlyPriceId } from "../../../config/stripe.config";
import { sslcommerzConfig } from "../../../config/sslcommerz.config";
import { ensureStoreSubscription } from "../../utils/subscription";
import { syncStorePlanFromSubscription } from "../../utils/planEnforcement";
import { SslCommerzBillingService } from "./sslcommerz-billing.service";

export type BillingProvider = "STRIPE" | "SSLCOMMERZ";

const assertStripe = () => {
  if (!isStripeConfigured || !stripe) {
    throw new AppError(
      StatusCodes.SERVICE_UNAVAILABLE,
      "Stripe is not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_PRO_MONTHLY to your server environment.",
    );
  }
  return stripe;
};

const mapStripeStatus = (status: Stripe.Subscription.Status): SubscriptionStatus => {
  switch (status) {
    case "trialing":
      return SubscriptionStatus.TRIALING;
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "past_due":
    case "unpaid":
      return SubscriptionStatus.PAST_DUE;
    case "canceled":
      return SubscriptionStatus.CANCELLED;
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      return SubscriptionStatus.EXPIRED;
    default:
      return SubscriptionStatus.ACTIVE;
  }
};

const mapInvoiceStatus = (status: Stripe.Invoice.Status | null): InvoiceStatus => {
  switch (status) {
    case "draft":
      return InvoiceStatus.DRAFT;
    case "open":
      return InvoiceStatus.OPEN;
    case "paid":
      return InvoiceStatus.PAID;
    case "void":
      return InvoiceStatus.VOID;
    case "uncollectible":
      return InvoiceStatus.UNCOLLECTIBLE;
    default:
      return InvoiceStatus.OPEN;
  }
};

const getUsage = async (storeId: string) => {
  const [productCount, memberCount] = await Promise.all([
    prisma.product.count({ where: { storeId } }),
    prisma.storeMember.count({ where: { storeId } }),
  ]);

  return { productCount, memberCount };
};

const getOverview = async (storeId: string) => {
  const [store, subscription, paymentMethods, invoices, usage] = await Promise.all([
    prisma.store.findUnique({ where: { id: storeId } }),
    ensureStoreSubscription(storeId),
    prisma.paymentMethod.findMany({ where: { storeId }, orderBy: { isDefault: "desc" } }),
    prisma.invoice.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    getUsage(storeId),
  ]);

  if (!store) {
    throw new AppError(StatusCodes.NOT_FOUND, "Store not found");
  }

  const limits = PLAN_LIMITS[store.plan];

  return {
    store: {
      id: store.id,
      brandName: store.brandName,
      plan: store.plan,
    },
    subscription,
    paymentMethods,
    invoices,
    usage,
    limits,
    stripeConfigured: isStripeConfigured,
    sslConfigured: sslcommerzConfig.isConfigured,
    sslBillingAmountBdt: sslcommerzConfig.billingProAmountBdt,
  };
};

const getPlans = () => {
  return (Object.keys(PLAN_LIMITS) as StorePlan[]).map((plan) => ({
    plan,
    ...PLAN_LIMITS[plan],
    mrr: PLAN_MRR[plan],
    stripePriceConfigured: plan === StorePlan.PRO ? isStripeConfigured : true,
    sslPriceConfigured: plan === StorePlan.PRO ? sslcommerzConfig.isConfigured : true,
    sslPriceBdt: plan === StorePlan.PRO ? sslcommerzConfig.billingProAmountBdt : null,
  }));
};

const getOrCreateStripeCustomer = async (storeId: string, email: string, name: string) => {
  const stripeClient = assertStripe();
  const subscription = await ensureStoreSubscription(storeId);

  if (subscription.stripeCustomerId) {
    return { stripeClient, subscription, customerId: subscription.stripeCustomerId };
  }

  const customer = await stripeClient.customers.create({
    email,
    name,
    metadata: { storeId },
  });

  const updated = await prisma.subscription.update({
    where: { storeId },
    data: { stripeCustomerId: customer.id },
  });

  return { stripeClient, subscription: updated, customerId: customer.id };
};

const createCheckoutSession = async (
  storeId: string,
  owner: { email: string; name: string },
  targetPlan: StorePlan,
  provider: BillingProvider = "STRIPE",
) => {
  if (targetPlan === StorePlan.FREE) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Use cancel subscription to return to the free plan.");
  }

  if (targetPlan === StorePlan.ENTERPRISE) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Contact sales for the Scale plan.");
  }

  if (provider === "SSLCOMMERZ") {
    return SslCommerzBillingService.createSslBillingCheckout(storeId, owner, targetPlan);
  }

  const stripeClient = assertStripe();
  const priceId = await resolveProMonthlyPriceId(stripeClient);

  try {
    const { customerId } = await getOrCreateStripeCustomer(storeId, owner.email, owner.name);

    const session = await stripeClient.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: stripeConfig.successUrl,
      cancel_url: stripeConfig.cancelUrl,
      metadata: { storeId, targetPlan },
      subscription_data: {
        metadata: { storeId, targetPlan },
      },
    });

    if (!session.url) {
      throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Stripe did not return a checkout URL.");
    }

    return { url: session.url };
  } catch (error) {
    if (error instanceof AppError) throw error;
    const stripeMessage = error instanceof Stripe.errors.StripeError ? error.message : null;
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      stripeMessage ?? "Could not create Stripe checkout session. Verify your Stripe keys and price configuration.",
    );
  }
};

const createPortalSession = async (storeId: string, owner: { email: string; name: string }) => {
  const stripeClient = assertStripe();

  try {
    const { customerId } = await getOrCreateStripeCustomer(storeId, owner.email, owner.name);

    const session = await stripeClient.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/dashboard/settings/billing`,
    });

    if (!session.url) {
      throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Stripe did not return a portal URL.");
    }

    return { url: session.url };
  } catch (error) {
    if (error instanceof AppError) throw error;
    const stripeMessage = error instanceof Stripe.errors.StripeError ? error.message : null;
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      stripeMessage ??
        "Could not open billing portal. Enable the Customer Portal in your Stripe Dashboard (Settings → Billing → Customer portal).",
    );
  }
};

const cancelSubscription = async (storeId: string) => {
  const subscription = await ensureStoreSubscription(storeId);

  if (subscription.plan === StorePlan.FREE) {
    return { message: "You are on the free plan." };
  }

  if (!subscription.stripeSubscriptionId) {
    if (subscription.billingProvider === "SSLCOMMERZ") {
      await prisma.subscription.update({
        where: { storeId },
        data: { cancelAtPeriodEnd: true },
      });
      return { message: "Subscription will cancel at the end of the billing period." };
    }

    await prisma.subscription.update({
      where: { storeId },
      data: { plan: StorePlan.FREE, status: SubscriptionStatus.ACTIVE, cancelAtPeriodEnd: false },
    });
    await prisma.store.update({ where: { id: storeId }, data: { plan: StorePlan.FREE } });
    return { message: "Subscription cancelled." };
  }

  const stripeClient = assertStripe();
  await stripeClient.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  await prisma.subscription.update({
    where: { storeId },
    data: { cancelAtPeriodEnd: true },
  });

  return { message: "Subscription will cancel at the end of the billing period." };
};

const upsertPaymentMethod = async (
  storeId: string,
  paymentMethod: Stripe.PaymentMethod,
  isDefault = false,
) => {
  const card = paymentMethod.card;
  await prisma.paymentMethod.upsert({
    where: { stripePaymentMethodId: paymentMethod.id },
    create: {
      storeId,
      stripePaymentMethodId: paymentMethod.id,
      brand: card?.brand ?? null,
      last4: card?.last4 ?? null,
      expMonth: card?.exp_month ?? null,
      expYear: card?.exp_year ?? null,
      isDefault,
    },
    update: {
      brand: card?.brand ?? null,
      last4: card?.last4 ?? null,
      expMonth: card?.exp_month ?? null,
      expYear: card?.exp_year ?? null,
      isDefault,
    },
  });

  if (isDefault) {
    await prisma.paymentMethod.updateMany({
      where: { storeId, NOT: { stripePaymentMethodId: paymentMethod.id } },
      data: { isDefault: false },
    });
  }
};

const syncSubscriptionFromStripe = async (stripeSubscription: Stripe.Subscription) => {
  const subData = stripeSubscription as Stripe.Subscription & {
    current_period_start?: number;
    current_period_end?: number;
  };

  const storeId = stripeSubscription.metadata.storeId;
  if (!storeId) return null;

  const targetPlan = (stripeSubscription.metadata.targetPlan as StorePlan) ?? StorePlan.PRO;
  const status = mapStripeStatus(stripeSubscription.status);

  const plan =
    status === SubscriptionStatus.CANCELLED || status === SubscriptionStatus.EXPIRED
      ? StorePlan.FREE
      : targetPlan;

  await ensureStoreSubscription(storeId);

  const updated = await prisma.subscription.update({
    where: { storeId },
    data: {
      plan,
      status,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId:
        typeof stripeSubscription.customer === "string"
          ? stripeSubscription.customer
          : stripeSubscription.customer.id,
      billingProvider: "STRIPE",
      currentPeriodStart: subData.current_period_start
        ? new Date(subData.current_period_start * 1000)
        : null,
      currentPeriodEnd: subData.current_period_end
        ? new Date(subData.current_period_end * 1000)
        : null,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    },
  });

  await prisma.store.update({ where: { id: storeId }, data: { plan } });
  return updated;
};

const resolveStoreIdFromInvoice = async (invoice: Stripe.Invoice) => {
  if (invoice.metadata?.storeId) return invoice.metadata.storeId;

  const subscriptionRef = (invoice as Stripe.Invoice & { subscription?: string | null }).subscription;
  if (!subscriptionRef || !stripe) return null;

  const stripeSub = await stripe.subscriptions.retrieve(subscriptionRef);
  return stripeSub.metadata.storeId ?? null;
};

const syncInvoiceFromStripe = async (invoice: Stripe.Invoice) => {
  const storeId = await resolveStoreIdFromInvoice(invoice);
  if (!storeId) return null;

  const subscription = await ensureStoreSubscription(storeId);

  return prisma.invoice.upsert({
    where: { stripeInvoiceId: invoice.id },
    create: {
      storeId,
      subscriptionId: subscription.id,
      stripeInvoiceId: invoice.id,
      amount: (invoice.amount_paid ?? invoice.amount_due ?? 0) / 100,
      currency: invoice.currency ?? "usd",
      status: mapInvoiceStatus(invoice.status),
      invoiceUrl: invoice.hosted_invoice_url ?? null,
      pdfUrl: invoice.invoice_pdf ?? null,
      paidAt: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : null,
    },
    update: {
      amount: (invoice.amount_paid ?? invoice.amount_due ?? 0) / 100,
      status: mapInvoiceStatus(invoice.status),
      invoiceUrl: invoice.hosted_invoice_url ?? null,
      pdfUrl: invoice.invoice_pdf ?? null,
      paidAt: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : null,
    },
  });
};

const handleWebhookEvent = async (event: Stripe.Event) => {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.subscription) {
        const stripeClient = assertStripe();
        const sub = await stripeClient.subscriptions.retrieve(session.subscription as string);
        await syncSubscriptionFromStripe(sub);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await syncSubscriptionFromStripe(event.data.object as Stripe.Subscription);
      break;
    }
    case "invoice.paid":
    case "invoice.payment_failed":
    case "invoice.finalized": {
      await syncInvoiceFromStripe(event.data.object as Stripe.Invoice);
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null };
      if (event.type === "invoice.payment_failed" && invoice.subscription && stripe) {
        const sub = await stripe.subscriptions.retrieve(invoice.subscription);
        await syncSubscriptionFromStripe(sub);
      }
      break;
    }
    case "payment_method.attached": {
      const pm = event.data.object as Stripe.PaymentMethod;
      const storeId = pm.metadata?.storeId;
      if (storeId) {
        await upsertPaymentMethod(storeId, pm, true);
      }
      break;
    }
    default:
      break;
  }
};

const adminListSubscriptions = async (query: Record<string, unknown>) => {
  const storesWithoutSub = await prisma.store.findMany({
    where: { subscription: null },
    select: { id: true, plan: true },
  });
  await Promise.all(storesWithoutSub.map((s) => ensureStoreSubscription(s.id, s.plan)));

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const skip = (page - 1) * limit;
  const plan = query.plan as StorePlan | undefined;
  const status = query.status as SubscriptionStatus | undefined;

  const where = {
    ...(plan ? { plan } : {}),
    ...(status ? { status } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        store: {
          select: {
            id: true,
            brandName: true,
            slug: true,
            plan: true,
            isSuspended: true,
            owner: { select: { id: true, name: true, email: true } },
            _count: { select: { products: true, orders: true } },
          },
        },
      },
    }),
    prisma.subscription.count({ where }),
  ]);

  const enriched = await Promise.all(
    data.map(async (sub) => {
      const paymentMethod = await prisma.paymentMethod.findFirst({
        where: { storeId: sub.storeId, isDefault: true },
      });
      return {
        ...sub,
        mrr: PLAN_MRR[sub.plan],
        paymentMethod,
      };
    }),
  );

  return { data: enriched, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

const adminGetSubscription = async (storeId: string) => {
  const subscription = await prisma.subscription.findUnique({
    where: { storeId },
    include: {
      store: {
        include: {
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { products: true, orders: true } },
        },
      },
      invoices: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!subscription) {
    throw new AppError(StatusCodes.NOT_FOUND, "Subscription not found");
  }

  const paymentMethods = await prisma.paymentMethod.findMany({ where: { storeId } });
  const usage = await getUsage(storeId);

  return { ...subscription, paymentMethods, usage, limits: PLAN_LIMITS[subscription.plan] };
};

const adminOverridePlan = async (storeId: string, plan: StorePlan) => {
  await ensureStoreSubscription(storeId);
  const subscription = await prisma.subscription.update({
    where: { storeId },
    data: {
      plan,
      status: SubscriptionStatus.ACTIVE,
      cancelAtPeriodEnd: false,
    },
  });

  await prisma.store.update({ where: { id: storeId }, data: { plan } });
  return subscription;
};

const adminBillingAnalytics = async () => {
  const [subscriptions, pastDue, paidInvoices] = await Promise.all([
    prisma.subscription.findMany({ select: { plan: true, status: true } }),
    prisma.subscription.count({ where: { status: SubscriptionStatus.PAST_DUE } }),
    prisma.invoice.aggregate({
      where: { status: InvoiceStatus.PAID },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const planDistribution = subscriptions.reduce(
    (acc, sub) => {
      acc[sub.plan] = (acc[sub.plan] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const mrr = subscriptions.reduce((sum, sub) => {
    if (sub.status === SubscriptionStatus.ACTIVE || sub.status === SubscriptionStatus.TRIALING) {
      return sum + PLAN_MRR[sub.plan];
    }
    return sum;
  }, 0);

  return {
    mrr,
    arr: mrr * 12,
    pastDue,
    totalInvoicesPaid: paidInvoices._count,
    totalRevenue: Number(paidInvoices._sum.amount ?? 0),
    planDistribution,
    activeSubscriptions: subscriptions.filter(
      (s) => s.status === SubscriptionStatus.ACTIVE || s.status === SubscriptionStatus.TRIALING,
    ).length,
  };
};

const adminFailedPayments = async () => {
  return prisma.subscription.findMany({
    where: { status: SubscriptionStatus.PAST_DUE },
    include: {
      store: {
        select: {
          id: true,
          brandName: true,
          slug: true,
          owner: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
};

export const BillingService = {
  getOverview,
  getPlans,
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
  handleWebhookEvent,
  adminListSubscriptions,
  adminGetSubscription,
  adminOverridePlan,
  adminBillingAnalytics,
  adminFailedPayments,
  syncStorePlanFromSubscription,
};
