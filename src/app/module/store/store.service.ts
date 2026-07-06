import { StatusCodes } from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { uploadFileToCloudinary } from "../../../config/cloudinary.config";
import { ICreateStorePayload, IUpdateStorePayload } from "./store.interface";
import { resolveUserStoreAccess } from "../../utils/storeAccess";
import { ensureStoreSubscription } from "../../utils/subscription";

const assertSlugAvailable = async (slug: string, excludeId?: string) => {
  const existing = await prisma.store.findFirst({
    where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
  });
  if (existing) {
    throw new AppError(StatusCodes.CONFLICT, "This store slug is already taken");
  }
};

const createStore = async (ownerId: string, payload: ICreateStorePayload) => {
  const existing = await prisma.store.findUnique({ where: { ownerId } });
  if (existing) {
    throw new AppError(StatusCodes.CONFLICT, "You already have a store");
  }

  await assertSlugAvailable(payload.slug);

  return prisma.store.create({
      data: {
        ownerId,
        brandName: payload.brandName,
        slug: payload.slug,
        country: payload.country,
        currency: payload.currency ?? "USD",
        description: payload.description ?? null,
      },
  }).then(async (store) => {
    await ensureStoreSubscription(store.id);
    return store;
  });
};

const getMyStore = async (userId: string) => {
  const access = await resolveUserStoreAccess(userId);
  if (!access) {
    throw new AppError(StatusCodes.NOT_FOUND, "Store not found");
  }

  const store = await prisma.store.findUnique({ where: { id: access.storeId } });
  if (!store) {
    throw new AppError(StatusCodes.NOT_FOUND, "Store not found");
  }

  return { ...store, accessRole: access.role };
};

const updateStore = async (
  storeId: string,
  ownerId: string,
  payload: IUpdateStorePayload,
  logoBuffer?: Buffer,
  logoName?: string,
  logoDarkBuffer?: Buffer,
  logoDarkName?: string,
  bannerBuffer?: Buffer,
  bannerName?: string,
  heroSlideFiles: Array<{ buffer: Buffer; originalname: string }> = [],
) => {
  const store = await prisma.store.findFirst({
    where: { id: storeId, ownerId },
  });

  if (!store) {
    throw new AppError(StatusCodes.NOT_FOUND, "Store not found");
  }

  if (payload.slug && payload.slug !== store.slug) {
    await assertSlugAvailable(payload.slug, storeId);
  }

  let logo = payload.logo;
  let logoDark = payload.logoDark;
  let banner = payload.banner;

  if (payload.logo === null) logo = null;
  if (payload.logoDark === null) logoDark = null;
  if (payload.banner === null) banner = null;

  if (logoBuffer && logoName) {
    const result = await uploadFileToCloudinary(logoBuffer, logoName);
    logo = result.secure_url;
  }

  if (logoDarkBuffer && logoDarkName) {
    const result = await uploadFileToCloudinary(logoDarkBuffer, logoDarkName);
    logoDark = result.secure_url;
  }

  if (bannerBuffer && bannerName) {
    const result = await uploadFileToCloudinary(bannerBuffer, bannerName);
    banner = result.secure_url;
  }

  const existingTheme = (store.theme ?? {}) as Record<string, unknown>;
  let nextTheme: Record<string, unknown> | undefined =
    payload.theme !== undefined
      ? {
          ...existingTheme,
          ...payload.theme,
          ...((payload.theme as Record<string, unknown>).branding
            ? {
                branding: {
                  ...((existingTheme.branding as Record<string, unknown>) ?? {}),
                  ...((payload.theme as Record<string, unknown>).branding as Record<string, unknown>),
                },
              }
            : {}),
        }
      : undefined;

  if (payload.heroSlidesMeta !== undefined) {
    if (heroSlideFiles.length === 0 && payload.heroSlidesMeta.some((m) => m.fileIndex !== undefined)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Hero slide files were not received");
    }

    const uploadedUrls = await Promise.all(
      heroSlideFiles.map((file) =>
        uploadFileToCloudinary(file.buffer, file.originalname).then((r) => r.secure_url),
      ),
    );

    const heroSlides: string[] = [];
    for (const item of payload.heroSlidesMeta) {
      if (item.existing) heroSlides.push(item.existing);
      else if (item.fileIndex !== undefined && uploadedUrls[item.fileIndex]) {
        heroSlides.push(uploadedUrls[item.fileIndex]);
      }
    }

    nextTheme = { ...(nextTheme ?? existingTheme), heroSlides };
    banner = heroSlides[0] ?? null;
  }

  return prisma.store.update({
    where: { id: storeId },
    data: {
      ...(payload.brandName !== undefined ? { brandName: payload.brandName } : {}),
      ...(payload.slug !== undefined ? { slug: payload.slug } : {}),
      ...(payload.country !== undefined ? { country: payload.country } : {}),
      ...(payload.currency !== undefined ? { currency: payload.currency } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.isPublished !== undefined ? { isPublished: payload.isPublished } : {}),
      ...(nextTheme !== undefined ? { theme: nextTheme as object } : payload.theme !== undefined ? { theme: payload.theme as object } : {}),
      ...(payload.shipping !== undefined ? { shipping: payload.shipping as object } : {}),
      ...(logo !== undefined ? { logo } : {}),
      ...(logoDark !== undefined ? { logoDark } : {}),
      ...(banner !== undefined ? { banner } : {}),
    },
  });
};

const getPublicStoreBySlug = async (slug: string, previewUserId?: string) => {
  const store = await prisma.store.findUnique({ where: { slug } });

  if (!store || store.isSuspended) {
    throw new AppError(StatusCodes.NOT_FOUND, "Store not found");
  }

  if (!store.isPublished) {
    if (!previewUserId) {
      throw new AppError(StatusCodes.NOT_FOUND, "Store not found");
    }
    const access = await resolveUserStoreAccess(previewUserId);
    if (!access || access.storeId !== store.id) {
      throw new AppError(StatusCodes.NOT_FOUND, "Store not found");
    }
    return { ...store, isPreview: true };
  }

  const cached = publicStoreCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.store;
  }

  publicStoreCache.set(slug, { store, expiresAt: Date.now() + PUBLIC_STORE_CACHE_MS });
  return store;
};

const PUBLIC_STORE_CACHE_MS = 60_000;
type CachedPublicStore = NonNullable<Awaited<ReturnType<typeof prisma.store.findUnique>>>;
const publicStoreCache = new Map<string, { store: CachedPublicStore; expiresAt: number }>();

export const StoreService = {
  createStore,
  getMyStore,
  updateStore,
  getPublicStoreBySlug,
};
