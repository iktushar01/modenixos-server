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
  },
};

export const PLAN_MRR: Record<StorePlan, number> = {
  FREE: 0,
  PRO: 29,
  ENTERPRISE: 99,
};
