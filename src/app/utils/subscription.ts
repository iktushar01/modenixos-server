import { prisma } from "../lib/prisma";
import { StorePlan } from "../lib/prisma-exports";
import { createSubscriptionWithTrial } from "./entitlements";

export async function ensureStoreSubscription(storeId: string, plan: StorePlan = StorePlan.FREE) {
  const existing = await prisma.subscription.findUnique({ where: { storeId } });
  if (existing) return existing;

  return prisma.subscription.create({
    data: { storeId, plan, status: "ACTIVE" },
  });
}

export async function ensureStoreSubscriptionWithTrial(storeId: string) {
  const existing = await prisma.subscription.findUnique({ where: { storeId } });
  if (existing) return existing;
  return createSubscriptionWithTrial(storeId);
}
