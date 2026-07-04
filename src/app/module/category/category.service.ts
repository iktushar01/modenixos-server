import { StatusCodes } from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { slugify } from "../../utils/slugify";
import { uploadFileToCloudinary } from "../../../config/cloudinary.config";

const createCategory = async (
  storeId: string,
  payload: { name: string; slug?: string; image?: string },
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
    return await prisma.category.create({
      data: { storeId, name: payload.name, slug, image: image ?? null },
    });
  } catch {
    throw new AppError(StatusCodes.CONFLICT, "Category slug already exists");
  }
};

const getCategories = async (storeId: string, query: Record<string, unknown>) => {
  return new QueryBuilder(prisma.category as any, query, {
    searchableFields: ["name", "slug"],
  })
    .where({ storeId })
    .search()
    .sort()
    .paginate()
    .execute();
};

const getCategory = async (storeId: string, id: string) => {
  const category = await prisma.category.findFirst({ where: { id, storeId } });
  if (!category) throw new AppError(StatusCodes.NOT_FOUND, "Category not found");
  return category;
};

const updateCategory = async (
  storeId: string,
  id: string,
  payload: { name?: string; slug?: string; image?: string },
  imageBuffer?: Buffer,
  imageName?: string,
) => {
  await getCategory(storeId, id);
  const existing = await prisma.category.findUnique({ where: { id } });
  let image: string | null = existing?.image ?? null;

  if (payload.image !== undefined) {
    image = payload.image === null ? null : (payload.image as string);
  }
  if (imageBuffer && imageName) {
    const result = await uploadFileToCloudinary(imageBuffer, imageName);
    image = result.secure_url;
  }

  return prisma.category.update({
    where: { id },
    data: {
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.slug !== undefined ? { slug: payload.slug } : {}),
      ...(payload.name && !payload.slug ? { slug: slugify(payload.name) } : {}),
      ...(payload.image !== undefined || imageBuffer ? { image } : {}),
    },
  });
};

const deleteCategory = async (storeId: string, id: string) => {
  await getCategory(storeId, id);
  await prisma.category.delete({ where: { id } });
};

export const CategoryService = {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
};
