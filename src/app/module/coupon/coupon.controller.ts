import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { CouponService } from "./coupon.service";
import { StoreService } from "../store/store.service";

const create = catchAsync(async (req: Request, res: Response) => {
  const result = await CouponService.createCoupon(req.storeId!, req.body);
  sendResponse(res, { statusCode: StatusCodes.CREATED, success: true, message: "Coupon created", data: result });
});

const getAll = catchAsync(async (req: Request, res: Response) => {
  const result = await CouponService.getCoupons(req.storeId!, req.query as Record<string, unknown>);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Coupons retrieved", data: result.data, meta: result.meta });
});

const update = catchAsync(async (req: Request, res: Response) => {
  const result = await CouponService.updateCoupon(req.storeId!, req.params.id as string, req.body);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Coupon updated", data: result });
});

const remove = catchAsync(async (req: Request, res: Response) => {
  await CouponService.deleteCoupon(req.storeId!, req.params.id as string);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Coupon deleted" });
});

const validatePublic = catchAsync(async (req: Request, res: Response) => {
  const store = await StoreService.getPublicStoreBySlug(req.params.slug as string);
  const result = await CouponService.validateCoupon(store.id, req.body.code, req.body.subtotal);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Coupon valid", data: result });
});

export const CouponController = { create, getAll, update, remove, validatePublic };
