import { StatusCodes } from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { ProductStatus, ReviewStatus } from "../../lib/prisma-exports";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { uploadFileToCloudinary } from "../../../config/cloudinary.config";
import { assertProductLimit } from "../../utils/planEnforcement";

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

const parseDetailsField = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
};

const parseColorImageFileMap = (value: unknown): Record<string, number> => {
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, number>;
      }
    } catch {
      return {};
    }
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, number>;
  }
  return {};
};

const applyColorImageFileMap = (
  details: unknown,
  uploadedUrls: string[],
  fileMap: Record<string, number>,
) => {
  if (!fileMap || Object.keys(fileMap).length === 0) return details;
  const base =
    details && typeof details === "object" && !Array.isArray(details)
      ? { ...(details as Record<string, unknown>) }
      : {};
  const colorImages = {
    ...(((base.colorImages as Record<string, string>) ?? {}) as Record<string, string>),
  };
  for (const [color, idx] of Object.entries(fileMap)) {
    const url = uploadedUrls[idx];
    if (url) colorImages[color] = url;
  }
  base.colorImages = colorImages;
  return base;
};

const createProduct = async (
  storeId: string,
  payload: Record<string, unknown>,
  imageFiles?: Express.Multer.File[],
) => {
  await assertProductLimit(storeId);

  const images = [...parseArrayField(payload.images)];
  const uploadedNew: string[] = [];
  if (imageFiles?.length) {
    for (const file of imageFiles) {
      const result = await uploadFileToCloudinary(file.buffer, file.originalname);
      uploadedNew.push(result.secure_url);
      images.push(result.secure_url);
    }
  }

  const fileMap = parseColorImageFileMap(payload.colorImageFileMap);
  let details = parseDetailsField(payload.details);
  details = applyColorImageFileMap(details, uploadedNew, fileMap);

  const maxSort = await prisma.product.aggregate({
    where: { storeId },
    _max: { sortOrder: true },
  });

  return prisma.product.create({
    data: {
      storeId,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
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
      ...(details !== undefined ? { details } : {}),
      status: (payload.status as ProductStatus) ?? ProductStatus.DRAFT,
    },
    include: { category: true, collection: true },
  });
};

const getProducts = async (storeId: string, query: Record<string, unknown>) => {
  const sortQuery = {
    ...query,
    sortBy: query.sortBy ?? "sortOrder",
    sortOrder: query.sortOrder ?? "asc",
  };

  return new QueryBuilder(prisma.product as any, sortQuery, {
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
  const uploadedNew: string[] = [];
  if (imageFiles?.length) {
    for (const file of imageFiles) {
      const result = await uploadFileToCloudinary(file.buffer, file.originalname);
      uploadedNew.push(result.secure_url);
      images.push(result.secure_url);
    }
  }

  const fileMap = parseColorImageFileMap(payload.colorImageFileMap);
  let details =
    payload.details !== undefined ? parseDetailsField(payload.details) : undefined;
  if (details !== undefined) {
    details = applyColorImageFileMap(details, uploadedNew, fileMap);
  } else if (Object.keys(fileMap).length > 0) {
    details = applyColorImageFileMap(existing?.details ?? {}, uploadedNew, fileMap);
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
      ...(details !== undefined ? { details } : {}),
      images,
    },
    include: { category: true, collection: true },
  });
};

const deleteProduct = async (storeId: string, id: string) => {
  await getProduct(storeId, id);
  await prisma.product.delete({ where: { id } });
};

const trimPublicListProduct = (product: Record<string, unknown>) => {
  const images = Array.isArray(product.images) ? product.images.slice(0, 1) : product.images;
  const { details: _details, ...rest } = product;
  return { ...rest, images };
};

const getPublicProducts = async (
  storeId: string,
  query: Record<string, unknown>,
) => {
  const where: Record<string, unknown> = { storeId, status: ProductStatus.ACTIVE };
  if (query.category) where.category = { slug: query.category };
  if (query.collection) where.collection = { slug: query.collection };
  if (query.featured === "true") where.collection = { isFeatured: true };
  if (query.size) where.sizes = { has: String(query.size) };
  if (query.color) where.colors = { has: String(query.color) };
  if (query.tag) where.tags = { has: String(query.tag) };
  if (query.sale === "true") {
    where.discountPrice = { not: null };
  }

  const minPrice = query.minPrice != null ? Number(query.minPrice) : undefined;
  const maxPrice = query.maxPrice != null ? Number(query.maxPrice) : undefined;
  if (minPrice != null && !Number.isNaN(minPrice)) {
    where.price = { ...(where.price as object), gte: minPrice };
  }
  if (maxPrice != null && !Number.isNaN(maxPrice)) {
    where.price = { ...(where.price as object), lte: maxPrice };
  }

  const sort = String(query.sort ?? "");
  let sortBy = (query.sortBy as string) ?? "sortOrder";
  let sortOrder = (query.sortOrder as string) ?? "asc";
  if (sort === "price-asc") {
    sortBy = "price";
    sortOrder = "asc";
  } else if (sort === "price-desc") {
    sortBy = "price";
    sortOrder = "desc";
  } else if (sort === "name") {
    sortBy = "name";
    sortOrder = "asc";
  } else if (sort === "newest") {
    sortBy = "createdAt";
    sortOrder = "desc";
  }

  const sortQuery = {
    ...query,
    sortBy,
    sortOrder,
  };

  const result = await new QueryBuilder(prisma.product as any, sortQuery, {
    searchableFields: ["name"],
  })
    .where(where)
    .search()
    .sort()
    .paginate()
    .include({
      category: { select: { id: true, name: true, slug: true, parentId: true } },
      collection: { select: { id: true, name: true, slug: true } },
    })
    .execute();

  return {
    ...result,
    data: (result.data as Record<string, unknown>[]).map(trimPublicListProduct),
  };
};

const getPublicProduct = async (storeId: string, id: string) => {
  const product = await prisma.product.findFirst({
    where: { id, storeId, status: ProductStatus.ACTIVE },
    include: {
      category: true,
      collection: true,
      reviews: {
        where: { status: ReviewStatus.APPROVED },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
  if (!product) throw new AppError(StatusCodes.NOT_FOUND, "Product not found");
  return product;
};

const reorderProducts = async (storeId: string, productIds: string[]) => {
  const uniqueIds = [...new Set(productIds)];
  if (uniqueIds.length === 0) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Product order cannot be empty");
  }

  const owned = await prisma.product.findMany({
    where: { storeId, id: { in: uniqueIds } },
    select: { id: true },
  });

  if (owned.length !== uniqueIds.length) {
    throw new AppError(StatusCodes.BAD_REQUEST, "One or more products are invalid");
  }

  await prisma.$transaction(
    uniqueIds.map((id, index) =>
      prisma.product.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  return { updated: uniqueIds.length };
};

export const ProductService = {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  reorderProducts,
  getPublicProducts,
  getPublicProduct,
};
