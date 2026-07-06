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

export const sendStorefrontOtpSchema = z.object({
  email: z.string().email().trim(),
  purpose: z.enum(["login", "register"]),
  name: z.string().min(2).max(100).trim().optional(),
}).superRefine((data, ctx) => {
  if (data.purpose === "register" && !data.name) {
    ctx.addIssue({
      code: "custom",
      message: "Name is required for registration",
      path: ["name"],
    });
  }
});

export const verifyStorefrontOtpSchema = z.object({
  email: z.string().email().trim(),
  otp: z
    .string()
    .min(4, "OTP must be at least 4 characters")
    .max(10, "OTP must be at most 10 characters"),
});

export const addWishlistSchema = z.object({
  productId: z.string().uuid(),
});
