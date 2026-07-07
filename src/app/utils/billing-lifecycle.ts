import { prisma } from "../lib/prisma";
import { SubscriptionStatus } from "../lib/prisma-exports";
import { processSubscriptionLifecycle } from "./entitlements";

const LIFECYCLE_INTERVAL_MS = 60 * 60 * 1000;

export const runBillingLifecycleSweep = async () => {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      OR: [
        { status: SubscriptionStatus.TRIALING },
        { cancelAtPeriodEnd: true },
        { billingProvider: "SSLCOMMERZ" },
      ],
    },
    select: { storeId: true },
  });

  for (const { storeId } of subscriptions) {
    try {
      await processSubscriptionLifecycle(storeId);
    } catch (error) {
      console.error("[billing-lifecycle] failed for store", storeId, error);
    }
  }
};

export const startBillingLifecycleScheduler = () => {
  void runBillingLifecycleSweep();
  setInterval(() => {
    void runBillingLifecycleSweep();
  }, LIFECYCLE_INTERVAL_MS);
};
