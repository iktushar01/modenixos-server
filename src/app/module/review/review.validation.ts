import z from "zod";
import { ReviewStatus } from "../../lib/prisma-exports";

export const createReviewZodSchema = z.object({
  productId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
  guestName: z.string().min(2).max(100).optional(),
  guestEmail: z.string().email().optional(),
});

export const updateReviewZodSchema = z.object({
  status: z.nativeEnum(ReviewStatus).optional(),
  reply: z.string().max(2000).optional(),
});
