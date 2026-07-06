const storeId = process.env.SSLC_STORE_ID?.trim() ?? "";
const storePassword = process.env.SSLC_STORE_PASSWORD?.trim() ?? "";
const isLive = process.env.SSLC_IS_LIVE === "true";

export const sslcommerzConfig = {
  storeId,
  storePassword,
  isLive,
  isConfigured: Boolean(storeId && storePassword),
  backendUrl: (process.env.BACKEND_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:5000").replace(/\/$/, ""),
  frontendUrl: (process.env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  apiBase: isLive ? "https://securepay.sslcommerz.com" : "https://sandbox.sslcommerz.com",
  successUrl: `${(process.env.BACKEND_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:5000").replace(/\/$/, "")}/api/v1/payment/success`,
  failUrl: `${(process.env.BACKEND_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:5000").replace(/\/$/, "")}/api/v1/payment/fail`,
  cancelUrl: `${(process.env.BACKEND_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:5000").replace(/\/$/, "")}/api/v1/payment/cancel`,
  ipnUrl: `${(process.env.BACKEND_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:5000").replace(/\/$/, "")}/api/v1/payment/ipn`,
  billingSuccessUrl: `${(process.env.BACKEND_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:5000").replace(/\/$/, "")}/api/v1/billing/ssl/success`,
  billingFailUrl: `${(process.env.BACKEND_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:5000").replace(/\/$/, "")}/api/v1/billing/ssl/fail`,
  billingCancelUrl: `${(process.env.BACKEND_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:5000").replace(/\/$/, "")}/api/v1/billing/ssl/cancel`,
  billingIpnUrl: `${(process.env.BACKEND_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:5000").replace(/\/$/, "")}/api/v1/billing/ssl/ipn`,
  billingProAmountBdt: Number(process.env.SSLC_BILLING_PRO_AMOUNT ?? 2900),
};
