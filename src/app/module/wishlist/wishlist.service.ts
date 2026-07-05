import { StatusCodes } from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { ProductStatus } from "../../lib/prisma-exports";

const getWishlist = async (storeId: string, customerId: string) => {
  const items = await prisma.wishlistItem.findMany({
    where: { storeId, customerId },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        include: { category: true, collection: true },
      },
    },
  });
  return items
    .filter((item) => item.product.status === ProductStatus.ACTIVE)
    .map((item) => ({
      id: item.id,
      productId: item.productId,
      createdAt: item.createdAt,
      product: item.product,
    }));
};

const addToWishlist = async (
  storeId: string,
  customerId: string,
  productId: string,
) => {
  const product = await prisma.product.findFirst({
    where: { id: productId, storeId, status: ProductStatus.ACTIVE },
  });
  if (!product) throw new AppError(StatusCodes.NOT_FOUND, "Product not found");

  const existing = await prisma.wishlistItem.findUnique({
    where: { customerId_productId: { customerId, productId } },
  });
  if (existing) return existing;

  return prisma.wishlistItem.create({
    data: { storeId, customerId, productId },
  });
};

const removeFromWishlist = async (
  storeId: string,
  customerId: string,
  productId: string,
) => {
  const item = await prisma.wishlistItem.findFirst({
    where: { storeId, customerId, productId },
  });
  if (!item) throw new AppError(StatusCodes.NOT_FOUND, "Item not in wishlist");
  await prisma.wishlistItem.delete({ where: { id: item.id } });
};

const isInWishlist = async (customerId: string, productId: string) => {
  const item = await prisma.wishlistItem.findUnique({
    where: { customerId_productId: { customerId, productId } },
  });
  return !!item;
};

const getWishlistProductIds = async (customerId: string) => {
  const items = await prisma.wishlistItem.findMany({
    where: { customerId },
    select: { productId: true },
  });
  return items.map((i) => i.productId);
};

export const WishlistService = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  isInWishlist,
  getWishlistProductIds,
};
