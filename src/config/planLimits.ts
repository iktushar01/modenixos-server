import { StorePlan } from "../app/lib/prisma-exports";

export type BillingInterval = "MONTHLY" | "YEARLY";

export type PlanLimits = {
  label: string;
  tagline: string;
  monthlyUsd: number;
  yearlyUsd: number;
  monthlyBdt: number;
  yearlyBdt: number;
  maxProducts: number;
  maxOrdersPerMonth: number;
  coupons: boolean;
  advancedAnalytics: boolean;
  customBranding: boolean;
  customDomain: boolean;
  prioritySupport: boolean;
  maxNewsletterSubscribers: number;
  maxNewsletterCampaignsPerMonth: number;
  maxProductsPerCampaign: number;
  comparisonFeatures: string[];
};

export const TRIAL_DAYS = 14;
export const TRIAL_PLAN = StorePlan.PRO_PLUS;

export const YEARLY_DISCOUNT_LABEL = "Save ~17%";

export const PAID_PLANS = [StorePlan.PRO, StorePlan.PRO_PLUS, StorePlan.ULTRA] as const;

export const PLAN_ORDER: Record<StorePlan, number> = {
  [StorePlan.FREE]: 0,
  [StorePlan.PRO]: 1,
  [StorePlan.PRO_PLUS]: 2,
  [StorePlan.ULTRA]: 3,
  [StorePlan.ENTERPRISE]: 3,
};

export const normalizeStorePlan = (plan: StorePlan): StorePlan => {
  if (plan === StorePlan.ENTERPRISE) return StorePlan.ULTRA;
  return plan;
};

export const isPaidPlan = (plan: StorePlan) => {
  const normalized = normalizeStorePlan(plan);
  return normalized !== StorePlan.FREE;
};

export const comparePlans = (a: StorePlan, b: StorePlan) =>
  PLAN_ORDER[normalizeStorePlan(a)] - PLAN_ORDER[normalizeStorePlan(b)];

export const PLAN_LIMITS: Record<StorePlan, PlanLimits> = {
  [StorePlan.FREE]: {
    label: "Free",
    tagline: "Launch your store",
    monthlyUsd: 0,
    yearlyUsd: 0,
    monthlyBdt: 0,
    yearlyBdt: 0,
    maxProducts: 25,
    maxOrdersPerMonth: 50,
    coupons: false,
    advancedAnalytics: false,
    customBranding: false,
    customDomain: false,
    prioritySupport: false,
    maxNewsletterSubscribers: 50,
    maxNewsletterCampaignsPerMonth: 1,
    maxProductsPerCampaign: 2,
    comparisonFeatures: [
      "25 products",
      "50 orders / month",
      "Public storefront",
      "Basic analytics",
      "Guest checkout",
    ],
  },
  [StorePlan.PRO]: {
    label: "Pro",
    tagline: "For solo sellers",
    monthlyUsd: 1,
    yearlyUsd: 10,
    monthlyBdt: 99,
    yearlyBdt: 999,
    maxProducts: 100,
    maxOrdersPerMonth: 500,
    coupons: true,
    advancedAnalytics: false,
    customBranding: true,
    customDomain: false,
    prioritySupport: false,
    maxNewsletterSubscribers: 500,
    maxNewsletterCampaignsPerMonth: 5,
    maxProductsPerCampaign: 5,
    comparisonFeatures: [
      "100 products",
      "500 orders / month",
      "Coupons & promotions",
      "Custom branding",
      "Newsletter (500 subs)",
    ],
  },
  [StorePlan.PRO_PLUS]: {
    label: "Pro+",
    tagline: "Growing businesses",
    monthlyUsd: 3,
    yearlyUsd: 30,
    monthlyBdt: 299,
    yearlyBdt: 2999,
    maxProducts: 500,
    maxOrdersPerMonth: 5000,
    coupons: true,
    advancedAnalytics: true,
    customBranding: true,
    customDomain: true,
    prioritySupport: false,
    maxNewsletterSubscribers: 2500,
    maxNewsletterCampaignsPerMonth: 20,
    maxProductsPerCampaign: 12,
    comparisonFeatures: [
      "500 products",
      "5,000 orders / month",
      "Advanced analytics & funnel",
      "Custom domain",
      "Newsletter (2,500 subs)",
    ],
  },
  [StorePlan.ULTRA]: {
    label: "Ultra Pro+",
    tagline: "Power sellers",
    monthlyUsd: 5,
    yearlyUsd: 50,
    monthlyBdt: 499,
    yearlyBdt: 4999,
    maxProducts: Number.POSITIVE_INFINITY,
    maxOrdersPerMonth: Number.POSITIVE_INFINITY,
    coupons: true,
    advancedAnalytics: true,
    customBranding: true,
    customDomain: true,
    prioritySupport: true,
    maxNewsletterSubscribers: Number.POSITIVE_INFINITY,
    maxNewsletterCampaignsPerMonth: Number.POSITIVE_INFINITY,
    maxProductsPerCampaign: 24,
    comparisonFeatures: [
      "Unlimited products",
      "Unlimited orders",
      "Everything in Pro+",
      "Priority support",
      "Unlimited newsletter",
    ],
  },
  [StorePlan.ENTERPRISE]: {
    label: "Ultra Pro+",
    tagline: "Power sellers",
    monthlyUsd: 5,
    yearlyUsd: 50,
    monthlyBdt: 499,
    yearlyBdt: 4999,
    maxProducts: Number.POSITIVE_INFINITY,
    maxOrdersPerMonth: Number.POSITIVE_INFINITY,
    coupons: true,
    advancedAnalytics: true,
    customBranding: true,
    customDomain: true,
    prioritySupport: true,
    maxNewsletterSubscribers: Number.POSITIVE_INFINITY,
    maxNewsletterCampaignsPerMonth: Number.POSITIVE_INFINITY,
    maxProductsPerCampaign: 24,
    comparisonFeatures: [
      "Unlimited products",
      "Unlimited orders",
      "Everything in Pro+",
      "Priority support",
      "Unlimited newsletter",
    ],
  },
};

export const getPlanPrice = (plan: StorePlan, interval: BillingInterval) => {
  const limits = PLAN_LIMITS[normalizeStorePlan(plan)];
  return interval === "YEARLY" ? limits.yearlyUsd : limits.monthlyUsd;
};

export const getPlanPriceBdt = (plan: StorePlan, interval: BillingInterval) => {
  const limits = PLAN_LIMITS[normalizeStorePlan(plan)];
  return interval === "YEARLY" ? limits.yearlyBdt : limits.monthlyBdt;
};

export const PLAN_MRR: Record<StorePlan, number> = {
  [StorePlan.FREE]: 0,
  [StorePlan.PRO]: 1,
  [StorePlan.PRO_PLUS]: 3,
  [StorePlan.ULTRA]: 5,
  [StorePlan.ENTERPRISE]: 5,
};

export const COMPARISON_ROWS: Array<{
  key: string;
  label: string;
  values: Record<"FREE" | "PRO" | "PRO_PLUS" | "ULTRA", string | boolean>;
}> = [
  {
    key: "price_monthly",
    label: "Monthly price",
    values: { FREE: "$0", PRO: "$1", PRO_PLUS: "$3", ULTRA: "$5" },
  },
  {
    key: "price_yearly",
    label: "Yearly price",
    values: { FREE: "$0", PRO: "$10", PRO_PLUS: "$30", ULTRA: "$50" },
  },
  {
    key: "products",
    label: "Products",
    values: { FREE: "25", PRO: "100", PRO_PLUS: "500", ULTRA: "Unlimited" },
  },
  {
    key: "orders",
    label: "Orders / month",
    values: { FREE: "50", PRO: "500", PRO_PLUS: "5,000", ULTRA: "Unlimited" },
  },
  {
    key: "coupons",
    label: "Coupons",
    values: { FREE: false, PRO: true, PRO_PLUS: true, ULTRA: true },
  },
  {
    key: "analytics",
    label: "Advanced analytics",
    values: { FREE: false, PRO: false, PRO_PLUS: true, ULTRA: true },
  },
  {
    key: "domain",
    label: "Custom domain",
    values: { FREE: false, PRO: false, PRO_PLUS: true, ULTRA: true },
  },
  {
    key: "branding",
    label: "Custom branding",
    values: { FREE: false, PRO: true, PRO_PLUS: true, ULTRA: true },
  },
  {
    key: "newsletter",
    label: "Newsletter subscribers",
    values: { FREE: "50", PRO: "500", PRO_PLUS: "2,500", ULTRA: "Unlimited" },
  },
  {
    key: "support",
    label: "Priority support",
    values: { FREE: false, PRO: false, PRO_PLUS: false, ULTRA: true },
  },
];
