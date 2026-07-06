import { StatusCodes } from "http-status-codes";
import AppError from "../errorHelpers/AppError";
import { prisma } from "../lib/prisma";
import { StorePlan } from "../lib/prisma-exports";
import { PLAN_LIMITS } from "../../config/planLimits";
import { ensureStoreSubscription } from "./subscription";

export async function getStorePlan(storeId: string): Promise<StorePlan> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { plan: true },
  });

  return store?.plan ?? StorePlan.FREE;
}

export async function assertProductLimit(storeId: string) {
  const plan = await getStorePlan(storeId);
  const limits = PLAN_LIMITS[plan];

  if (!Number.isFinite(limits.maxProducts)) return;

  const count = await prisma.product.count({ where: { storeId } });
  if (count >= limits.maxProducts) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      `Your ${limits.label} plan allows up to ${limits.maxProducts} products. Upgrade to add more.`,
    );
  }
}

export async function assertCouponsAllowed(storeId: string) {
  const plan = await getStorePlan(storeId);
  if (!PLAN_LIMITS[plan].coupons) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "Coupons are available on Growth and Scale plans. Upgrade to create coupons.",
    );
  }
}

export async function assertAdvancedAnalytics(storeId: string) {
  const plan = await getStorePlan(storeId);
  if (!PLAN_LIMITS[plan].advancedAnalytics) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "Advanced analytics are available on Growth and Scale plans.",
    );
  }
}

export async function syncStorePlanFromSubscription(storeId: string) {
  const subscription = await ensureStoreSubscription(storeId);
  await prisma.store.update({
    where: { id: storeId },
    data: { plan: subscription.plan },
  });
  return subscription;
}
