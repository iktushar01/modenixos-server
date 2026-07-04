import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { AdminService } from "./admin.service";

const getStores = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAllStores(req.query as Record<string, unknown>);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Stores retrieved", data: result.data, meta: result.meta });
});

const suspendStore = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.suspendStore(req.params.id as string, req.body.isSuspended);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Store updated", data: result });
});

const getUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAllUsers(req.query as Record<string, unknown>);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Users retrieved", data: result.data, meta: result.meta });
});

const getAnalytics = catchAsync(async (_req: Request, res: Response) => {
  const result = await AdminService.getPlatformAnalytics();
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Platform analytics retrieved", data: result });
});

export const AdminController = { getStores, suspendStore, getUsers, getAnalytics };
