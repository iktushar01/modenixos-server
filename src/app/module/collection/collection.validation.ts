import z from "zod";

const optionalImageUrl = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? null : val),
  z.union([z.string().url(), z.null()]).optional(),
);

export const createCollectionZodSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/).optional(),
  image: optionalImageUrl,
  isFeatured: z.coerce.boolean().optional(),
});

export const updateCollectionZodSchema = createCollectionZodSchema.partial();

export const reorderCollectionsZodSchema = z.object({
  collectionIds: z.array(z.string().uuid()).min(1),
});
