import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { StoreService } from "../store/store.service";
import { StorefrontCustomerService } from "./storefront-customer.service";

const register = catchAsync(async (req: Request, res: Response) => {
  const store = await StoreService.getPublicStoreBySlug(req.params.slug as string);
  const result = await StorefrontCustomerService.register(
    store.id,
    store.slug,
    req.body,
    res,
  );
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Account created",
    data: result,
  });
});

const login = catchAsync(async (req: Request, res: Response) => {
  const store = await StoreService.getPublicStoreBySlug(req.params.slug as string);
  const result = await StorefrontCustomerService.login(
    store.id,
    store.slug,
    req.body,
    res,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Logged in",
    data: result,
  });
});

const logout = catchAsync(async (req: Request, res: Response) => {
  StorefrontCustomerService.logout(req.params.slug as string, res);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Logged out",
  });
});

const me = catchAsync(async (req: Request, res: Response) => {
  const result = await StorefrontCustomerService.getMe(
    req.storefrontCustomerStoreId!,
    req.storefrontCustomerId!,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Customer retrieved",
    data: result,
  });
});

export const StorefrontCustomerController = { register, login, logout, me };
