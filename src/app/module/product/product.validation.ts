import z from "zod";
import { ProductStatus } from "../../lib/prisma-exports";

const formArray = z.preprocess((val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === "string" && val.trim()) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // fall through to comma split
    }
    return val.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}, z.array(z.string()));

const formImageUrls = z.preprocess((val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === "string" && val.trim()) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [val];
    }
  }
  return [];
}, z.array(z.string().url()));

const optionalUuid = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.string().uuid().optional(),
);

const optionalPositiveNumber = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().positive().optional(),
);

export const createProductZodSchema = z.object({
  name: z.string().min(2).max(200).trim(),
  description: z.string().max(5000).optional(),
  price: z.coerce.number().positive(),
  discountPrice: optionalPositiveNumber,
  categoryId: optionalUuid,
  collectionId: optionalUuid,
  stock: z.coerce.number().int().min(0).optional(),
  sku: z.string().max(100).optional(),
  images: formImageUrls.optional(),
  sizes: formArray.optional(),
  colors: formArray.optional(),
  tags: formArray.optional(),
  status: z.nativeEnum(ProductStatus).optional(),
});

export const updateProductZodSchema = createProductZodSchema.partial();
