import { StatusCodes } from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { ReviewStatus } from "../../lib/prisma-exports";
import { QueryBuilder } from "../../utils/QueryBuilder";

const createPublicReview = async (
  storeId: string,
  payload: { productId: string; rating: number; comment?: string; guestName?: string; guestEmail?: string },
) => {
  const product = await prisma.product.findFirst({ where: { id: payload.productId, storeId } });
  if (!product) throw new AppError(StatusCodes.NOT_FOUND, "Product not found");

  return prisma.review.create({
    data: {
      storeId,
      productId: payload.productId,
      rating: payload.rating,
      comment: payload.comment ?? null,
      guestName: payload.guestName ?? null,
      guestEmail: payload.guestEmail ?? null,
      status: ReviewStatus.PENDING,
    },
  });
};

const getReviews = async (storeId: string, query: Record<string, unknown>) => {
  return new QueryBuilder(prisma.review as any, query, {
    filterableFields: ["status", "productId"],
  })
    .where({ storeId })
    .filter()
    .sort()
    .paginate()
    .include({ product: { select: { id: true, name: true, images: true } } })
    .execute();
};

const updateReview = async (
  storeId: string,
  id: string,
  payload: { status?: ReviewStatus; reply?: string },
) => {
  const review = await prisma.review.findFirst({ where: { id, storeId } });
  if (!review) throw new AppError(StatusCodes.NOT_FOUND, "Review not found");
  return prisma.review.update({ where: { id }, data: payload });
};

const deleteReview = async (storeId: string, id: string) => {
  const review = await prisma.review.findFirst({ where: { id, storeId } });
  if (!review) throw new AppError(StatusCodes.NOT_FOUND, "Review not found");
  await prisma.review.delete({ where: { id } });
};

const getPublicReviews = async (storeId: string, query: Record<string, unknown>) => {
  return new QueryBuilder(prisma.review as any, query, {
    filterableFields: ["productId"],
  })
    .where({ storeId, status: ReviewStatus.APPROVED })
    .filter()
    .sort()
    .paginate()
    .include({ product: { select: { id: true, name: true, images: true } } })
    .execute();
};

export const ReviewService = { createPublicReview, getReviews, getPublicReviews, updateReview, deleteReview };
