import z from "zod";
import { StorePlan } from "../../lib/prisma-exports";

export const suspendStoreZodSchema = z.object({
  isSuspended: z.boolean(),
});

export const adminOverridePlanZodSchema = z.object({
  plan: z.enum([StorePlan.FREE, StorePlan.PRO, StorePlan.ENTERPRISE]),
});
