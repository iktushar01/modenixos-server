import { StatusCodes } from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { slugify } from "../../utils/slugify";
import { uploadFileToCloudinary } from "../../../config/cloudinary.config";

const createCollection = async (
  storeId: string,
  payload: { name: string; slug?: string; image?: string; isFeatured?: boolean },
  imageBuffer?: Buffer,
  imageName?: string,
) => {
  const slug = payload.slug ?? slugify(payload.name);
  const maxSort = await prisma.collection.aggregate({
    where: { storeId },
    _max: { sortOrder: true },
  });

  let image = payload.image;
  if (imageBuffer && imageName) {
    const result = await uploadFileToCloudinary(imageBuffer, imageName);
    image = result.secure_url;
  }
  try {
    return await prisma.collection.create({
      data: { storeId, name: payload.name, slug, image: image ?? null, isFeatured: payload.isFeatured ?? false, sortOrder: (maxSort._max.sortOrder ?? -1) + 1 },
    });
  } catch {
    throw new AppError(StatusCodes.CONFLICT, "Collection slug already exists");
  }
};

const getCollections = async (storeId: string, query: Record<string, unknown>) => {
  const sortOrder = query.sortOrder === "desc" ? "desc" : "asc";
  const params = {
    ...query,
    sortBy: typeof query.sortBy === "string" ? query.sortBy : "sortOrder",
    sortOrder,
  };

  return new QueryBuilder(prisma.collection as any, params, {
    searchableFields: ["name", "slug"],
    filterableFields: ["isFeatured"],
  })
    .where({ storeId })
    .search()
    .filter()
    .sort()
    .paginate()
    .execute();
};

const getCollection = async (storeId: string, id: string) => {
  const item = await prisma.collection.findFirst({ where: { id, storeId } });
  if (!item) throw new AppError(StatusCodes.NOT_FOUND, "Collection not found");
  return item;
};

const updateCollection = async (
  storeId: string,
  id: string,
  payload: { name?: string; slug?: string; image?: string | null; isFeatured?: boolean },
  imageBuffer?: Buffer,
  imageName?: string,
) => {
  await getCollection(storeId, id);
  const existing = await prisma.collection.findUnique({ where: { id } });
  let image: string | null = existing?.image ?? null;

  if (payload.image !== undefined) {
    image = payload.image === null ? null : payload.image;
  }
  if (imageBuffer && imageName) {
    const result = await uploadFileToCloudinary(imageBuffer, imageName);
    image = result.secure_url;
  }

  return prisma.collection.update({
    where: { id },
    data: {
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.slug !== undefined ? { slug: payload.slug } : {}),
      ...(payload.name && !payload.slug ? { slug: slugify(payload.name) } : {}),
      ...(payload.isFeatured !== undefined ? { isFeatured: payload.isFeatured } : {}),
      ...(payload.image !== undefined || imageBuffer ? { image } : {}),
    },
  });
};

const deleteCollection = async (storeId: string, id: string) => {
  await getCollection(storeId, id);
  await prisma.collection.delete({ where: { id } });
};

const reorderCollections = async (storeId: string, collectionIds: string[]) => {
  const uniqueIds = [...new Set(collectionIds)];
  if (uniqueIds.length === 0) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Collection order cannot be empty");
  }

  const owned = await prisma.collection.findMany({
    where: { storeId, id: { in: uniqueIds } },
    select: { id: true },
  });

  if (owned.length !== uniqueIds.length) {
    throw new AppError(StatusCodes.BAD_REQUEST, "One or more collections are invalid");
  }

  await prisma.$transaction(
    uniqueIds.map((id, index) =>
      prisma.collection.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  return { updated: uniqueIds.length };
};

export const CollectionService = {
  createCollection,
  getCollections,
  getCollection,
  updateCollection,
  deleteCollection,
  reorderCollections,
};
