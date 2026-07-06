import z from "zod";
import { StorePlan } from "../../lib/prisma-exports";

export const checkoutZodSchema = z.object({
  plan: z.enum([StorePlan.PRO]),
});

export const adminOverridePlanZodSchema = z.object({
  plan: z.enum([StorePlan.FREE, StorePlan.PRO, StorePlan.ENTERPRISE]),
});
