import z from "zod";
import { CouponType } from "../../lib/prisma-exports";

export const createCouponZodSchema = z.object({
  code: z.string().min(2).max(30).trim(),
  type: z.nativeEnum(CouponType),
  value: z.coerce.number().positive(),
  minOrder: z.coerce.number().min(0).optional(),
  usageLimit: z.coerce.number().int().positive().optional(),
  expiresAt: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});

export const updateCouponZodSchema = createCouponZodSchema.partial();

export const validateCouponZodSchema = z.object({
  code: z.string().min(2),
  subtotal: z.coerce.number().min(0),
});
