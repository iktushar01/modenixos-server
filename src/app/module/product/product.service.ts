import { StatusCodes } from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { ProductStatus } from "../../lib/prisma-exports";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { uploadFileToCloudinary } from "../../../config/cloudinary.config";

const parseArrayField = (value: unknown): string[] => {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return value.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
};

const createProduct = async (
  storeId: string,
  payload: Record<string, unknown>,
  imageFiles?: Express.Multer.File[],
) => {
  const images = [...parseArrayField(payload.images)];
  if (imageFiles?.length) {
    for (const file of imageFiles) {
      const result = await uploadFileToCloudinary(file.buffer, file.originalname);
      images.push(result.secure_url);
    }
  }

  return prisma.product.create({
    data: {
      storeId,
      name: payload.name as string,
      description: (payload.description as string | undefined) ?? null,
      price: Number(payload.price),
      discountPrice: payload.discountPrice ? Number(payload.discountPrice) : null,
      categoryId: (payload.categoryId as string | undefined) ?? null,
      collectionId: (payload.collectionId as string | undefined) ?? null,
      stock: payload.stock !== undefined ? Number(payload.stock) : 0,
      sku: (payload.sku as string | undefined) ?? null,
      images,
      sizes: parseArrayField(payload.sizes),
      colors: parseArrayField(payload.colors),
      tags: parseArrayField(payload.tags),
      status: (payload.status as ProductStatus) ?? ProductStatus.DRAFT,
    },
    include: { category: true, collection: true },
  });
};

const getProducts = async (storeId: string, query: Record<string, unknown>) => {
  return new QueryBuilder(prisma.product as any, query, {
    searchableFields: ["name", "sku", "description"],
    filterableFields: ["status", "categoryId", "collectionId"],
  })
    .where({ storeId })
    .search()
    .filter()
    .sort()
    .paginate()
    .include({ category: true, collection: true })
    .execute();
};

const getProduct = async (storeId: string, id: string) => {
  const product = await prisma.product.findFirst({
    where: { id, storeId },
    include: { category: true, collection: true, reviews: { where: { status: "APPROVED" } } },
  });
  if (!product) throw new AppError(StatusCodes.NOT_FOUND, "Product not found");
  return product;
};

const updateProduct = async (
  storeId: string,
  id: string,
  payload: Record<string, unknown>,
  imageFiles?: Express.Multer.File[],
) => {
  await getProduct(storeId, id);
  const existing = await prisma.product.findUnique({ where: { id } });
  const images = payload.images !== undefined ? parseArrayField(payload.images) : existing?.images ?? [];
  if (imageFiles?.length) {
    for (const file of imageFiles) {
      const result = await uploadFileToCloudinary(file.buffer, file.originalname);
      images.push(result.secure_url);
    }
  }

  return prisma.product.update({
    where: { id },
    data: {
      ...(payload.name !== undefined ? { name: payload.name as string } : {}),
      ...(payload.description !== undefined ? { description: payload.description as string } : {}),
      ...(payload.price !== undefined ? { price: Number(payload.price) } : {}),
      ...(payload.discountPrice !== undefined ? { discountPrice: Number(payload.discountPrice) } : {}),
      ...(payload.categoryId !== undefined ? { categoryId: payload.categoryId as string | null } : {}),
      ...(payload.collectionId !== undefined ? { collectionId: payload.collectionId as string | null } : {}),
      ...(payload.stock !== undefined ? { stock: Number(payload.stock) } : {}),
      ...(payload.sku !== undefined ? { sku: payload.sku as string } : {}),
      ...(payload.status !== undefined ? { status: payload.status as ProductStatus } : {}),
      ...(payload.sizes !== undefined ? { sizes: parseArrayField(payload.sizes) } : {}),
      ...(payload.colors !== undefined ? { colors: parseArrayField(payload.colors) } : {}),
      ...(payload.tags !== undefined ? { tags: parseArrayField(payload.tags) } : {}),
      images,
    },
    include: { category: true, collection: true },
  });
};

const deleteProduct = async (storeId: string, id: string) => {
  await getProduct(storeId, id);
  await prisma.product.delete({ where: { id } });
};

const getPublicProducts = async (
  storeId: string,
  query: Record<string, unknown>,
) => {
  const where: Record<string, unknown> = { storeId, status: ProductStatus.ACTIVE };
  if (query.category) where.category = { slug: query.category };
  if (query.collection) where.collection = { slug: query.collection };
  if (query.featured === "true") where.collection = { isFeatured: true };

  return new QueryBuilder(prisma.product as any, query, {
    searchableFields: ["name"],
  })
    .where(where)
    .search()
    .sort()
    .paginate()
    .include({ category: true, collection: true })
    .execute();
};

const getPublicProduct = async (storeId: string, id: string) => {
  const product = await prisma.product.findFirst({
    where: { id, storeId, status: ProductStatus.ACTIVE },
    include: {
      category: true,
      collection: true,
      reviews: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!product) throw new AppError(StatusCodes.NOT_FOUND, "Product not found");
  return product;
};

export const ProductService = {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getPublicProducts,
  getPublicProduct,
};
