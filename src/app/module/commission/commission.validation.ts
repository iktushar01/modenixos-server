import z from "zod";
import { CommissionBase, CommissionType, OrderStatus } from "../../lib/prisma-exports";

export const updateCommissionSettingsZodSchema = z.object({
  isEnabled: z.boolean().optional(),
  commissionType: z.enum([CommissionType.PERCENT, CommissionType.FIXED]).optional(),
  commissionValue: z.number().min(0).optional(),
  commissionBase: z.enum([CommissionBase.SUBTOTAL, CommissionBase.TOTAL]).optional(),
  triggerStatus: z
    .enum([
      OrderStatus.CONFIRMED,
      OrderStatus.PACKED,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
    ])
    .optional(),
});
