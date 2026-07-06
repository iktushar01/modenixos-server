import z from "zod";

export const checkoutZodSchema = z.object({
  plan: z.literal("PRO"),
  provider: z.enum(["STRIPE", "SSLCOMMERZ"]).optional().default("STRIPE"),
});

export const adminOverridePlanZodSchema = z.object({
  plan: z.enum(["FREE", "PRO", "ENTERPRISE"]),
});
