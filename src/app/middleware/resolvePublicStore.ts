import type { NextFunction, Request, Response } from "express";
import { catchAsync } from "../shared/catchAsync";
import { StoreService } from "../module/store/store.service";

/** Resolves store once per public /stores/:slug/* request and sets req.storeId. */
export const resolvePublicStore = catchAsync(
  async (req: Request, _res: Response, next: NextFunction) => {
    const slug = req.params.slug as string;
    const previewUserId = req.user?.userId;
    const store = await StoreService.getPublicStoreBySlug(slug, previewUserId);
    req.storeId = store.id;
    (req as Request & { publicStore?: typeof store }).publicStore = store;
    next();
  },
);
