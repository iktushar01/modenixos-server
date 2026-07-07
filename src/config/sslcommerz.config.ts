const storeId = process.env.SSLC_STORE_ID?.trim() ?? "";
const storePassword = process.env.SSLC_STORE_PASSWORD?.trim() ?? "";
const isLive = process.env.SSLC_IS_LIVE === "true";

const backendBase = (process.env.BACKEND_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:5000").replace(
  /\/$/,
  "",
);
const frontendBase = (process.env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const sslcommerzConfig = {
  storeId,
  storePassword,
  isLive,
  isConfigured: Boolean(storeId && storePassword),
  backendUrl: backendBase,
  frontendUrl: frontendBase,
  apiBase: isLive ? "https://securepay.sslcommerz.com" : "https://sandbox.sslcommerz.com",
  successUrl: `${backendBase}/api/v1/payment/success`,
  failUrl: `${backendBase}/api/v1/payment/fail`,
  cancelUrl: `${backendBase}/api/v1/payment/cancel`,
  ipnUrl: `${backendBase}/api/v1/payment/ipn`,
  billingSuccessUrl: `${backendBase}/api/v1/billing/ssl/success`,
  billingFailUrl: `${backendBase}/api/v1/billing/ssl/fail`,
  billingCancelUrl: `${backendBase}/api/v1/billing/ssl/cancel`,
  billingIpnUrl: `${backendBase}/api/v1/billing/ssl/ipn`,
};
