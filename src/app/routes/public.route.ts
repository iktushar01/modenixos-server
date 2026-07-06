import { Router } from "express";
import { validateRequest } from "../middleware/validateRequest";
import { resolvePublicStore } from "../middleware/resolvePublicStore";
import { ProductService } from "../module/product/product.service";
import { CollectionService } from "../module/collection/collection.service";
import { CategoryService } from "../module/category/category.service";
import { ReviewService } from "../module/review/review.service";
import { OrderController } from "../module/order/order.controller";
import { ReviewController } from "../module/review/review.controller";
import { CouponController } from "../module/coupon/coupon.controller";
import { StorefrontCustomerController } from "../module/storefront-customer/storefront-customer.controller";
import { WishlistController } from "../module/wishlist/wishlist.controller";
import { createOrderZodSchema, trackOrderQuerySchema } from "../module/order/order.validation";
import { PublicPaymentRoute } from "../module/payment/payment.route";
import { createReviewZodSchema } from "../module/review/review.validation";
import { validateCouponZodSchema } from "../module/coupon/coupon.validation";
import {
  registerStorefrontCustomerSchema,
  loginStorefrontCustomerSchema,
  addWishlistSchema,
} from "../module/storefront-customer/storefront-customer.validation";
import { requireStorefrontCustomer } from "../middleware/storefrontCustomerAuth";
import { catchAsync } from "../shared/catchAsync";
import { sendResponse } from "../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import { Request, Response } from "express";

const router = Router();
const storeRouter = Router({ mergeParams: true });

storeRouter.use(resolvePublicStore);

storeRouter.get(
  "/",
  catchAsync(async (req: Request, res: Response) => {
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Store retrieved",
      data: (req as Request & { publicStore?: unknown }).publicStore,
    });
  }),
);

storeRouter.get(
  "/categories",
  catchAsync(async (req: Request, res: Response) => {
    const result = await CategoryService.getCategories(req.storeId!, req.query as Record<string, unknown>);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Categories retrieved",
      data: result.data,
      meta: result.meta,
    });
  }),
);

storeRouter.get(
  "/collections",
  catchAsync(async (req: Request, res: Response) => {
    const result = await CollectionService.getCollections(req.storeId!, req.query as Record<string, unknown>);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Collections retrieved",
      data: result.data,
      meta: result.meta,
    });
  }),
);

storeRouter.get(
  "/reviews",
  catchAsync(async (req: Request, res: Response) => {
    const result = await ReviewService.getPublicReviews(req.storeId!, req.query as Record<string, unknown>);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Reviews retrieved",
      data: result.data,
      meta: result.meta,
    });
  }),
);

storeRouter.get(
  "/products",
  catchAsync(async (req: Request, res: Response) => {
    const result = await ProductService.getPublicProducts(req.storeId!, req.query as Record<string, unknown>);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Products retrieved",
      data: result.data,
      meta: result.meta,
    });
  }),
);

storeRouter.get(
  "/products/:id",
  catchAsync(async (req: Request, res: Response) => {
    const result = await ProductService.getPublicProduct(req.storeId!, req.params.id as string);
    sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Product retrieved", data: result });
  }),
);

storeRouter.post(
  "/orders",
  validateRequest(createOrderZodSchema),
  OrderController.createPublic,
);

storeRouter.use("/payment", PublicPaymentRoute);

storeRouter.get(
  "/orders/track",
  validateRequest(trackOrderQuerySchema, "query"),
  OrderController.trackOrder,
);

storeRouter.get(
  "/orders/me",
  requireStorefrontCustomer,
  OrderController.getMyOrders,
);

storeRouter.get(
  "/orders/:orderNumber",
  requireStorefrontCustomer,
  OrderController.getMyOrder,
);

storeRouter.post(
  "/reviews",
  validateRequest(createReviewZodSchema),
  ReviewController.createPublic,
);

storeRouter.post(
  "/coupons/validate",
  validateRequest(validateCouponZodSchema),
  CouponController.validatePublic,
);

storeRouter.post(
  "/customers/register",
  validateRequest(registerStorefrontCustomerSchema),
  StorefrontCustomerController.register,
);

storeRouter.post(
  "/customers/login",
  validateRequest(loginStorefrontCustomerSchema),
  StorefrontCustomerController.login,
);

storeRouter.post("/customers/logout", StorefrontCustomerController.logout);

storeRouter.get(
  "/customers/me",
  requireStorefrontCustomer,
  StorefrontCustomerController.me,
);

storeRouter.get("/wishlist", requireStorefrontCustomer, WishlistController.list);

storeRouter.post(
  "/wishlist",
  requireStorefrontCustomer,
  validateRequest(addWishlistSchema),
  WishlistController.add,
);

storeRouter.delete(
  "/wishlist/:productId",
  requireStorefrontCustomer,
  WishlistController.remove,
);

storeRouter.get(
  "/wishlist/:productId",
  requireStorefrontCustomer,
  WishlistController.check,
);

router.use("/stores/:slug", storeRouter);

export const PublicRoute = router;
