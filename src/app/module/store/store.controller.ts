import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { StoreService } from "./store.service";

const createStore = catchAsync(async (req: Request, res: Response) => {
  const result = await StoreService.createStore(req.user!.userId, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Store created successfully",
    data: result,
  });
});

const getMyStore = catchAsync(async (req: Request, res: Response) => {
  const result = await StoreService.getMyStore(req.user!.userId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Store retrieved successfully",
    data: result,
  });
});

const updateStore = catchAsync(async (req: Request, res: Response) => {
  const logoFile = (req as any).files?.logo?.[0];
  const bannerFile = (req as any).files?.banner?.[0];

  const result = await StoreService.updateStore(
    req.params.id as string,
    req.user!.userId,
    req.body,
    logoFile?.buffer,
    logoFile?.originalname,
    bannerFile?.buffer,
    bannerFile?.originalname,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Store updated successfully",
    data: result,
  });
});

const getPublicStore = catchAsync(async (req: Request, res: Response) => {
  const result = await StoreService.getPublicStoreBySlug(req.params.slug as string);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Store retrieved successfully",
    data: result,
  });
});

export const StoreController = {
  createStore,
  getMyStore,
  updateStore,
  getPublicStore,
};
