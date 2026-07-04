import z from "zod";
import { ProductStatus } from "../../lib/prisma-exports";

export const createProductZodSchema = z.object({
  name: z.string().min(2).max(200).trim(),
  description: z.string().max(5000).optional(),
  price: z.coerce.number().positive(),
  discountPrice: z.coerce.number().positive().optional(),
  categoryId: z.string().uuid().optional(),
  collectionId: z.string().uuid().optional(),
  stock: z.coerce.number().int().min(0).optional(),
  sku: z.string().max(100).optional(),
  images: z.array(z.string().url()).optional(),
  sizes: z.array(z.string()).optional(),
  colors: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  status: z.nativeEnum(ProductStatus).optional(),
});

export const updateProductZodSchema = createProductZodSchema.partial();
