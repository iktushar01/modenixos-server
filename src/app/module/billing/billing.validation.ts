import z from "zod";

export const checkoutZodSchema = z.object({
  plan: z.literal("PRO"),
});

export const adminOverridePlanZodSchema = z.object({
  plan: z.enum(["FREE", "PRO", "ENTERPRISE"]),
});
