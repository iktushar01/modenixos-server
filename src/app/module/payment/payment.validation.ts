import z from "zod";
import { createOrderZodSchema } from "../order/order.validation";

export const createPaymentZodSchema = createOrderZodSchema.extend({
  paymentMethod: z.literal("SSLCOMMERZ").optional().default("SSLCOMMERZ"),
});

export const sslCallbackQuerySchema = z.object({
  val_id: z.string().optional(),
  tran_id: z.string().optional(),
  status: z.string().optional(),
  value_a: z.string().optional(),
  value_b: z.string().optional(),
});
