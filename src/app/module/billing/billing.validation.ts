import z from "zod";
import { StorePlan } from "../../lib/prisma-exports";

export const checkoutZodSchema = z.object({
  plan: z.enum([StorePlan.PRO, StorePlan.PRO_PLUS, StorePlan.ULTRA]),
  interval: z.enum(["MONTHLY", "YEARLY"]).optional().default("MONTHLY"),
  provider: z.enum(["STRIPE", "SSLCOMMERZ"]).optional().default("STRIPE"),
});

export const adminOverridePlanZodSchema = z.object({
  plan: z.enum([
    StorePlan.FREE,
    StorePlan.PRO,
    StorePlan.PRO_PLUS,
    StorePlan.ULTRA,
    StorePlan.ENTERPRISE,
  ]),
});
