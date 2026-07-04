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
  let image = payload.image;
  if (imageBuffer && imageName) {
    const result = await uploadFileToCloudinary(imageBuffer, imageName);
    image = result.secure_url;
  }
  try {
    return await prisma.collection.create({
      data: { storeId, name: payload.name, slug, image: image ?? null, isFeatured: payload.isFeatured ?? false },
    });
  } catch {
    throw new AppError(StatusCodes.CONFLICT, "Collection slug already exists");
  }
};

const getCollections = async (storeId: string, query: Record<string, unknown>) => {
  return new QueryBuilder(prisma.collection as any, query, {
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
  payload: { name?: string; slug?: string; image?: string; isFeatured?: boolean },
  imageBuffer?: Buffer,
  imageName?: string,
) => {
  await getCollection(storeId, id);
  let image = payload.image;
  if (imageBuffer && imageName) {
    const result = await uploadFileToCloudinary(imageBuffer, imageName);
    image = result.secure_url;
  }
  return prisma.collection.update({
    where: { id },
    data: {
      ...payload,
      ...(payload.name && !payload.slug ? { slug: slugify(payload.name) } : {}),
      ...(image !== undefined ? { image } : {}),
    },
  });
};

const deleteCollection = async (storeId: string, id: string) => {
  await getCollection(storeId, id);
  await prisma.collection.delete({ where: { id } });
};

export const CollectionService = {
  createCollection,
  getCollections,
  getCollection,
  updateCollection,
  deleteCollection,
};
