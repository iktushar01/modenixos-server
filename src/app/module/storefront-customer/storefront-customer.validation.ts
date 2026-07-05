import z from "zod";

export const registerStorefrontCustomerSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().trim(),
  password: z.string().min(6).max(100),
});

export const loginStorefrontCustomerSchema = z.object({
  email: z.string().email().trim(),
  password: z.string().min(1),
});

export const addWishlistSchema = z.object({
  productId: z.string().uuid(),
});
