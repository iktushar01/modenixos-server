import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { WishlistService } from "./wishlist.service";

const list = catchAsync(async (req: Request, res: Response) => {
  const result = await WishlistService.getWishlist(
    req.storefrontCustomerStoreId!,
    req.storefrontCustomerId!,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Wishlist retrieved",
    data: result,
  });
});

const add = catchAsync(async (req: Request, res: Response) => {
  const result = await WishlistService.addToWishlist(
    req.storefrontCustomerStoreId!,
    req.storefrontCustomerId!,
    req.body.productId,
  );
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Added to wishlist",
    data: result,
  });
});

const remove = catchAsync(async (req: Request, res: Response) => {
  await WishlistService.removeFromWishlist(
    req.storefrontCustomerStoreId!,
    req.storefrontCustomerId!,
    req.params.productId as string,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Removed from wishlist",
  });
});

const check = catchAsync(async (req: Request, res: Response) => {
  const inWishlist = await WishlistService.isInWishlist(
    req.storefrontCustomerId!,
    req.params.productId as string,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Wishlist status",
    data: { inWishlist },
  });
});

export const WishlistController = { list, add, remove, check };
