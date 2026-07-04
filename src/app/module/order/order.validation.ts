import z from "zod";
import { OrderStatus } from "../../lib/prisma-exports";

const orderItemSchema = z.object({
  productId: z.string().uuid(),
  name: z.string(),
  price: z.coerce.number().positive(),
  quantity: z.coerce.number().int().positive(),
  size: z.string().optional(),
  color: z.string().optional(),
  image: z.string().optional(),
});

export const createOrderZodSchema = z.object({
  items: z.array(orderItemSchema).min(1),
  customerName: z.string().min(2).max(100),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  shippingAddress: z.object({
    line1: z.string().min(2),
    line2: z.string().optional(),
    city: z.string().min(2),
    state: z.string().optional(),
    postalCode: z.string().min(2),
    country: z.string().min(2),
  }),
  subtotal: z.coerce.number().min(0),
  shipping: z.coerce.number().min(0).optional(),
  discount: z.coerce.number().min(0).optional(),
  total: z.coerce.number().positive(),
  couponCode: z.string().optional(),
  paymentMethod: z.string().optional(),
});

export const updateOrderStatusZodSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});
