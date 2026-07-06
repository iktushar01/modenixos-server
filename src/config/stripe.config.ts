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
