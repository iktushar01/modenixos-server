import z from "zod";

const optionalImageUrl = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? null : val),
  z.union([z.string().url(), z.null()]).optional(),
);

const optionalParentId = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? null : val),
  z.string().uuid().nullable().optional(),
);

export const createCategoryZodSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/).optional(),
  image: optionalImageUrl,
  parentId: optionalParentId,
});

export const updateCategoryZodSchema = createCategoryZodSchema.partial();

export const reorderCategoriesZodSchema = z.object({
  categoryIds: z.array(z.string().uuid()).min(1),
});
