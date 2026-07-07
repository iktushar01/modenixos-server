import { StorePlan } from "../app/lib/prisma-exports";

export type PlanLimits = {
  label: string;
  priceMonthly: number | null;
  maxProducts: number;
  coupons: boolean;
  advancedAnalytics: boolean;
  customBranding: boolean;
  customDomain: boolean;
  prioritySupport: boolean;
  maxNewsletterSubscribers: number;
  maxNewsletterCampaignsPerMonth: number;
  maxProductsPerCampaign: number;
};

export const PLAN_LIMITS: Record<StorePlan, PlanLimits> = {
  FREE: {
    label: "Starter",
    priceMonthly: 0,
    maxProducts: 50,
    coupons: false,
    advancedAnalytics: false,
    customBranding: false,
    customDomain: false,
    prioritySupport: false,
    maxNewsletterSubscribers: 100,
    maxNewsletterCampaignsPerMonth: 2,
    maxProductsPerCampaign: 3,
  },
  PRO: {
    label: "Growth",
    priceMonthly: 29,
    maxProducts: Number.POSITIVE_INFINITY,
    coupons: true,
    advancedAnalytics: true,
    customBranding: true,
    customDomain: false,
    prioritySupport: true,
    maxNewsletterSubscribers: 5000,
    maxNewsletterCampaignsPerMonth: 20,
    maxProductsPerCampaign: 12,
  },
  ENTERPRISE: {
    label: "Scale",
    priceMonthly: null,
    maxProducts: Number.POSITIVE_INFINITY,
    coupons: true,
    advancedAnalytics: true,
    customBranding: true,
    customDomain: true,
    prioritySupport: true,
    maxNewsletterSubscribers: Number.POSITIVE_INFINITY,
    maxNewsletterCampaignsPerMonth: Number.POSITIVE_INFINITY,
    maxProductsPerCampaign: 24,
  },
};

export const PLAN_MRR: Record<StorePlan, number> = {
  FREE: 0,
  PRO: 29,
  ENTERPRISE: 99,
};
