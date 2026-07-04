import z from "zod";

export const createCategoryZodSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/).optional(),
  image: z.string().url().optional(),
});

export const updateCategoryZodSchema = createCategoryZodSchema.partial();
