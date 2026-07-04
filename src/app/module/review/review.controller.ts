import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { ReviewService } from "./review.service";
import { StoreService } from "../store/store.service";

const createPublic = catchAsync(async (req: Request, res: Response) => {
  const store = await StoreService.getPublicStoreBySlug(req.params.slug as string);
  const result = await ReviewService.createPublicReview(store.id, req.body);
  sendResponse(res, { statusCode: StatusCodes.CREATED, success: true, message: "Review submitted", data: result });
});

const getAll = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.getReviews(req.storeId!, req.query as Record<string, unknown>);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Reviews retrieved", data: result.data, meta: result.meta });
});

const update = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.updateReview(req.storeId!, req.params.id as string, req.body);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Review updated", data: result });
});

const remove = catchAsync(async (req: Request, res: Response) => {
  await ReviewService.deleteReview(req.storeId!, req.params.id as string);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Review deleted" });
});

export const ReviewController = { createPublic, getAll, update, remove };
