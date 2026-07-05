import z from "zod";

const slugSchema = z
  .string()
  .min(2, "Slug must be at least 2 characters")
  .max(50)
  .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only");

const themeField = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return undefined;
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return undefined;
    }
  }
  return val;
}, z.record(z.string(), z.unknown()).optional());

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
  isPublished: z.coerce.boolean().optional(),
  theme: themeField,
  shipping: themeField,
  logo: z.preprocess((val) => (val === "" ? null : val), z.string().nullable().optional()),
  banner: z.preprocess((val) => (val === "" ? null : val), z.string().nullable().optional()),
  heroSlidesMeta: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch {
        return undefined;
      }
    }
    return val;
  }, z.array(z.union([
    z.object({ existing: z.string().min(1) }),
    z.object({ fileIndex: z.number().int().min(0) }),
  ])).optional()),
});
