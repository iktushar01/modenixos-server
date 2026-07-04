import z from "zod";

const slugSchema = z
  .string()
  .min(2, "Slug must be at least 2 characters")
  .max(50)
  .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only");

export const createStoreZodSchema = z.object({
  brandName: z.string().min(2).max(100).trim(),
  slug: slugSchema,
  country: z.string().min(2).max(100).trim(),
  currency: z.string().length(3).optional().default("USD"),
  description: z.string().max(1000).optional(),
});

export const updateStoreZodSchema = z.object({
  brandName: z.string().min(2).max(100).trim().optional(),
  slug: slugSchema.optional(),
  country: z.string().min(2).max(100).trim().optional(),
  currency: z.string().length(3).optional(),
  description: z.string().max(1000).optional(),
  isPublished: z.boolean().optional(),
  theme: z.record(z.string(), z.unknown()).optional(),
  shipping: z.record(z.string(), z.unknown()).optional(),
});
