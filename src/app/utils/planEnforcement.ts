import { StatusCodes } from "http-status-codes";
import AppError from "../errorHelpers/AppError";
import { prisma } from "../lib/prisma";
import { StorePlan } from "../lib/prisma-exports";
import { normalizeStorePlan, PLAN_LIMITS } from "../../config/planLimits";
import { ensureStoreSubscription } from "./subscription";
import { resolveEntitlements } from "./entitlements";

export async function getStorePlan(storeId: string): Promise<StorePlan> {
  const entitlements = await resolveEntitlements(storeId);
  return entitlements.plan;
}

export async function assertProductLimit(storeId: string) {
  const plan = await getStorePlan(storeId);
  const limits = PLAN_LIMITS[normalizeStorePlan(plan)];

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
  if (!PLAN_LIMITS[normalizeStorePlan(plan)].coupons) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "Coupons are available on Pro plans and above. Upgrade to create coupons.",
    );
  }
}

export async function assertAdvancedAnalytics(storeId: string) {
  const plan = await getStorePlan(storeId);
  if (!PLAN_LIMITS[normalizeStorePlan(plan)].advancedAnalytics) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "Advanced analytics are available on Pro+ and Ultra plans.",
    );
  }
}

export async function syncStorePlanFromSubscription(storeId: string) {
  const subscription = await ensureStoreSubscription(storeId);
  const plan = normalizeStorePlan(subscription.plan);
  await prisma.store.update({
    where: { id: storeId },
    data: { plan },
  });
  return subscription;
}
