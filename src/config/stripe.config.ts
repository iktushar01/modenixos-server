import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";

export const isStripeConfigured = Boolean(secretKey);

export const stripe = isStripeConfigured
  ? new Stripe(secretKey)
  : null;

export const stripeConfig = {
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "",
  priceProMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY?.trim() ?? "",
  successUrl: `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/dashboard/settings/billing?checkout=success`,
  cancelUrl: `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/dashboard/settings/billing?checkout=cancelled`,
};

let cachedProPriceId: string | null = stripeConfig.priceProMonthly || null;

/**
 * Resolves the Growth (PRO) monthly Stripe Price ID.
 * Uses STRIPE_PRICE_PRO_MONTHLY when set; otherwise finds or creates a $29/mo price in Stripe.
 */
export async function resolveProMonthlyPriceId(stripeClient: Stripe): Promise<string> {
  if (stripeConfig.priceProMonthly) {
    return stripeConfig.priceProMonthly;
  }

  if (cachedProPriceId) {
    return cachedProPriceId;
  }

  const existingProducts = await stripeClient.products.search({
    query: "metadata['modenixos_plan']:'PRO'",
    limit: 1,
  }).catch(() => ({ data: [] as Stripe.Product[] }));

  let product = existingProducts.data[0];

  if (!product) {
    const listed = await stripeClient.products.list({ active: true, limit: 100 });
    product = listed.data.find((p) => p.metadata?.modenixos_plan === "PRO");
  }

  if (!product) {
    product = await stripeClient.products.create({
      name: "ModenixOS Growth",
      description: "Unlimited products, coupons, advanced analytics, and priority support.",
      metadata: { modenixos_plan: "PRO" },
    });
  }

  const prices = await stripeClient.prices.list({
    product: product.id,
    active: true,
    limit: 20,
  });

  const monthlyPrice = prices.data.find(
    (p) => p.recurring?.interval === "month" && p.currency === "usd",
  );

  if (monthlyPrice) {
    cachedProPriceId = monthlyPrice.id;
    return monthlyPrice.id;
  }

  const created = await stripeClient.prices.create({
    product: product.id,
    unit_amount: 2900,
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { modenixos_plan: "PRO" },
  });

  cachedProPriceId = created.id;
  return created.id;
}
