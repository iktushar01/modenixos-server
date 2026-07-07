import { prisma } from "../lib/prisma";
import { StorePlan, SubscriptionStatus } from "../lib/prisma-exports";
import {
  normalizeStorePlan,
  PLAN_LIMITS,
  TRIAL_DAYS,
  TRIAL_PLAN,
  type PlanLimits,
} from "../../config/planLimits";

export type StoreEntitlements = {
  plan: StorePlan;
  subscriptionPlan: StorePlan;
  status: SubscriptionStatus;
  limits: PlanLimits;
  isTrialing: boolean;
  trialDaysLeft: number | null;
  trialEndsAt: string | null;
  trialUsed: boolean;
  canStartTrial: boolean;
  billingInterval: "MONTHLY" | "YEARLY";
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  billingProvider: string | null;
  isPaid: boolean;
};

const daysBetween = (from: Date, to: Date) =>
  Math.max(0, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));

const syncStorePlan = async (storeId: string, plan: StorePlan) => {
  await prisma.store.update({
    where: { id: storeId },
    data: { plan: normalizeStorePlan(plan) },
  });
};

export const downgradeToFree = async (storeId: string, reason?: string) => {
  await prisma.subscription.update({
    where: { storeId },
    data: {
      plan: StorePlan.FREE,
      status: SubscriptionStatus.ACTIVE,
      cancelAtPeriodEnd: false,
      billingProvider: null,
      stripeSubscriptionId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      trialEndsAt: null,
      billingInterval: "MONTHLY",
      ...(reason ? {} : {}),
    },
  });
  await syncStorePlan(storeId, StorePlan.FREE);
};

export const activatePaidPlan = async (
  storeId: string,
  plan: StorePlan,
  options: {
    status?: SubscriptionStatus;
    billingProvider: string;
    billingInterval?: "MONTHLY" | "YEARLY";
    periodStart?: Date;
    periodEnd?: Date;
    stripeSubscriptionId?: string | null;
    stripeCustomerId?: string | null;
    cancelAtPeriodEnd?: boolean;
    clearTrial?: boolean;
  },
) => {
  const normalized = normalizeStorePlan(plan);
  const now = options.periodStart ?? new Date();
  const periodEnd =
    options.periodEnd ??
    (() => {
      const end = new Date(now);
      if (options.billingInterval === "YEARLY") {
        end.setFullYear(end.getFullYear() + 1);
      } else {
        end.setMonth(end.getMonth() + 1);
      }
      return end;
    })();

  await prisma.subscription.update({
    where: { storeId },
    data: {
      plan: normalized,
      status: options.status ?? SubscriptionStatus.ACTIVE,
      billingProvider: options.billingProvider,
      billingInterval: options.billingInterval ?? "MONTHLY",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: options.cancelAtPeriodEnd ?? false,
      ...(options.clearTrial ? { trialEndsAt: null } : {}),
      ...(options.stripeSubscriptionId !== undefined
        ? { stripeSubscriptionId: options.stripeSubscriptionId }
        : {}),
      ...(options.stripeCustomerId !== undefined
        ? { stripeCustomerId: options.stripeCustomerId }
        : {}),
    },
  });

  await syncStorePlan(storeId, normalized);
};

export const processSubscriptionLifecycle = async (storeId: string) => {
  const subscription = await prisma.subscription.findUnique({ where: { storeId } });
  if (!subscription) return;

  const now = new Date();

  if (
    subscription.status === SubscriptionStatus.TRIALING &&
    subscription.trialEndsAt &&
    subscription.trialEndsAt <= now
  ) {
    await downgradeToFree(storeId);
    return;
  }

  if (
    subscription.cancelAtPeriodEnd &&
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd <= now
  ) {
    await downgradeToFree(storeId);
    return;
  }

  if (
    subscription.billingProvider === "SSLCOMMERZ" &&
    subscription.status === SubscriptionStatus.ACTIVE &&
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd <= now &&
    !subscription.stripeSubscriptionId
  ) {
    await downgradeToFree(storeId);
  }
};

export const resolveEntitlements = async (storeId: string): Promise<StoreEntitlements> => {
  await processSubscriptionLifecycle(storeId);

  const subscription = await prisma.subscription.findUnique({ where: { storeId } });
  if (!subscription) {
    return {
      plan: StorePlan.FREE,
      subscriptionPlan: StorePlan.FREE,
      status: SubscriptionStatus.ACTIVE,
      limits: PLAN_LIMITS[StorePlan.FREE],
      isTrialing: false,
      trialDaysLeft: null,
      trialEndsAt: null,
      trialUsed: false,
      canStartTrial: true,
      billingInterval: "MONTHLY",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      billingProvider: null,
      isPaid: false,
    };
  }

  const plan = normalizeStorePlan(subscription.plan);
  const isTrialing = subscription.status === SubscriptionStatus.TRIALING;
  const trialDaysLeft =
    isTrialing && subscription.trialEndsAt
      ? daysBetween(new Date(), subscription.trialEndsAt)
      : null;

  const effectivePlan =
    subscription.status === SubscriptionStatus.TRIALING ? plan : plan;

  if (subscription.plan !== effectivePlan) {
    await syncStorePlan(storeId, effectivePlan);
  }

  const limits = PLAN_LIMITS[effectivePlan];
  const isPaid =
    !isTrialing &&
    effectivePlan !== StorePlan.FREE &&
    (subscription.status === SubscriptionStatus.ACTIVE ||
      subscription.status === SubscriptionStatus.PAST_DUE);

  return {
    plan: effectivePlan,
    subscriptionPlan: effectivePlan,
    status: subscription.status,
    limits,
    isTrialing,
    trialDaysLeft,
    trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
    trialUsed: subscription.trialUsed,
    canStartTrial:
      !subscription.trialUsed &&
      effectivePlan === StorePlan.FREE &&
      subscription.status === SubscriptionStatus.ACTIVE,
    billingInterval: subscription.billingInterval,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    billingProvider: subscription.billingProvider,
    isPaid,
  };
};

export const createSubscriptionWithTrial = async (storeId: string) => {
  const existing = await prisma.subscription.findUnique({ where: { storeId } });
  if (existing) return existing;

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  const subscription = await prisma.subscription.create({
    data: {
      storeId,
      plan: TRIAL_PLAN,
      status: SubscriptionStatus.TRIALING,
      trialEndsAt,
      trialUsed: true,
    },
  });

  await syncStorePlan(storeId, TRIAL_PLAN);
  return subscription;
};

export const startTrial = async (storeId: string) => {
  const subscription = await prisma.subscription.findUnique({ where: { storeId } });
  if (!subscription) {
    return createSubscriptionWithTrial(storeId);
  }

  if (subscription.trialUsed) {
    throw new Error("Trial already used");
  }

  if (subscription.plan !== StorePlan.FREE && subscription.status !== SubscriptionStatus.TRIALING) {
    throw new Error("Trial is only available on the free plan");
  }

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  const updated = await prisma.subscription.update({
    where: { storeId },
    data: {
      plan: TRIAL_PLAN,
      status: SubscriptionStatus.TRIALING,
      trialEndsAt,
      trialUsed: true,
      cancelAtPeriodEnd: false,
      billingProvider: null,
      stripeSubscriptionId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
    },
  });

  await syncStorePlan(storeId, TRIAL_PLAN);
  return updated;
};
