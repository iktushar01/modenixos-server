import z from "zod";

export const createCollectionZodSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/).optional(),
  image: z.string().url().optional(),
  isFeatured: z.boolean().optional(),
});

export const updateCollectionZodSchema = createCollectionZodSchema.partial();
