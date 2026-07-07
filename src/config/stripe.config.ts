import Stripe from "stripe";
import { StorePlan } from "../app/lib/prisma-exports";
import {
  getPlanPrice,
  normalizeStorePlan,
  PLAN_LIMITS,
  type BillingInterval,
} from "./planLimits";

const secretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";

export const isStripeConfigured = Boolean(secretKey);

export const stripe = isStripeConfigured ? new Stripe(secretKey) : null;

export const stripeConfig = {
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "",
  successUrl: `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/dashboard/settings/billing?checkout=success`,
  cancelUrl: `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/dashboard/settings/billing?checkout=cancelled`,
};

const priceEnvKey = (plan: StorePlan, interval: BillingInterval) => {
  const planKey = normalizeStorePlan(plan);
  const intervalKey = interval === "YEARLY" ? "YEARLY" : "MONTHLY";
  return `STRIPE_PRICE_${planKey}_${intervalKey}`;
};

const priceCache = new Map<string, string>();

export const getStripePriceIdFromEnv = (plan: StorePlan, interval: BillingInterval) => {
  const key = priceEnvKey(plan, interval);
  return process.env[key]?.trim() ?? "";
};

const unitAmountCents = (plan: StorePlan, interval: BillingInterval) => {
  const usd = getPlanPrice(plan, interval);
  return Math.round(usd * 100);
};

export async function resolveStripePriceId(
  stripeClient: Stripe,
  plan: StorePlan,
  interval: BillingInterval,
): Promise<string> {
  const normalized = normalizeStorePlan(plan);
  if (normalized === StorePlan.FREE) {
    throw new Error("Free plan has no Stripe price");
  }

  const cacheKey = `${normalized}_${interval}`;
  const fromEnv = getStripePriceIdFromEnv(normalized, interval);
  if (fromEnv) return fromEnv;

  const cached = priceCache.get(cacheKey);
  if (cached) return cached;

  const productQuery = `metadata['modenixos_plan']:'${normalized}'`;
  const existingProducts = await stripeClient.products
    .search({ query: productQuery, limit: 1 })
    .catch(() => ({ data: [] as Stripe.Product[] }));

  let product = existingProducts.data[0];
  if (!product) {
    const listed = await stripeClient.products.list({ active: true, limit: 100 });
    product = listed.data.find((p) => p.metadata?.modenixos_plan === normalized);
  }

  if (!product) {
    const limits = PLAN_LIMITS[normalized];
    product = await stripeClient.products.create({
      name: `ModenixOS ${limits.label}`,
      description: limits.tagline,
      metadata: { modenixos_plan: normalized },
    });
  }

  const prices = await stripeClient.prices.list({
    product: product.id,
    active: true,
    limit: 50,
  });

  const stripeInterval = interval === "YEARLY" ? "year" : "month";
  const existing = prices.data.find(
    (p) => p.recurring?.interval === stripeInterval && p.currency === "usd",
  );

  if (existing) {
    priceCache.set(cacheKey, existing.id);
    return existing.id;
  }

  const created = await stripeClient.prices.create({
    product: product.id,
    unit_amount: unitAmountCents(normalized, interval),
    currency: "usd",
    recurring: { interval: stripeInterval },
    metadata: { modenixos_plan: normalized, modenixos_interval: interval },
  });

  priceCache.set(cacheKey, created.id);
  return created.id;
}
