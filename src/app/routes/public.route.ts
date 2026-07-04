import { Router } from "express";
import { validateRequest } from "../middleware/validateRequest";
import { PublicStoreRoute } from "../module/store/store.route";
import { ProductService } from "../module/product/product.service";
import { StoreService } from "../module/store/store.service";
import { CollectionService } from "../module/collection/collection.service";
import { ReviewService } from "../module/review/review.service";
import { OrderController } from "../module/order/order.controller";
import { ReviewController } from "../module/review/review.controller";
import { CouponController } from "../module/coupon/coupon.controller";
import { createOrderZodSchema } from "../module/order/order.validation";
import { createReviewZodSchema } from "../module/review/review.validation";
import { validateCouponZodSchema } from "../module/coupon/coupon.validation";
import { catchAsync } from "../shared/catchAsync";
import { sendResponse } from "../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import { Request, Response } from "express";

const router = Router();

router.use("/stores", PublicStoreRoute);

router.get(
  "/stores/:slug/collections",
  catchAsync(async (req: Request, res: Response) => {
    const store = await StoreService.getPublicStoreBySlug(req.params.slug as string);
    const result = await CollectionService.getCollections(store.id, req.query as Record<string, unknown>);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Collections retrieved",
      data: result.data,
      meta: result.meta,
    });
  }),
);

router.get(
  "/stores/:slug/reviews",
  catchAsync(async (req: Request, res: Response) => {
    const store = await StoreService.getPublicStoreBySlug(req.params.slug as string);
    const result = await ReviewService.getPublicReviews(store.id, req.query as Record<string, unknown>);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Reviews retrieved",
      data: result.data,
      meta: result.meta,
    });
  }),
);

router.get(
  "/stores/:slug/products",
  catchAsync(async (req: Request, res: Response) => {
    const store = await StoreService.getPublicStoreBySlug(req.params.slug as string);
    const result = await ProductService.getPublicProducts(store.id, req.query as Record<string, unknown>);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Products retrieved",
      data: result.data,
      meta: result.meta,
    });
  }),
);

router.get(
  "/stores/:slug/products/:id",
  catchAsync(async (req: Request, res: Response) => {
    const store = await StoreService.getPublicStoreBySlug(req.params.slug as string);
    const result = await ProductService.getPublicProduct(store.id, req.params.id as string);
    sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Product retrieved", data: result });
  }),
);

router.post(
  "/stores/:slug/orders",
  validateRequest(createOrderZodSchema),
  OrderController.createPublic,
);

router.post(
  "/stores/:slug/reviews",
  validateRequest(createReviewZodSchema),
  ReviewController.createPublic,
);

router.post(
  "/stores/:slug/coupons/validate",
  validateRequest(validateCouponZodSchema),
  CouponController.validatePublic,
);

export const PublicRoute = router;
