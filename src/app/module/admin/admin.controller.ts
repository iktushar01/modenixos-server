import type { Request, Response } from "express";
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

const getSubscriptions = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.listSubscriptions(req.query as Record<string, unknown>);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Subscriptions retrieved", data: result.data, meta: result.meta });
});

const getSubscription = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getSubscription(req.params.storeId as string);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Subscription retrieved", data: result });
});

const overridePlan = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.overridePlan(req.params.id as string, req.body.plan);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Plan updated", data: result });
});

const getBillingAnalytics = catchAsync(async (_req: Request, res: Response) => {
  const result = await AdminService.getBillingAnalytics();
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Billing analytics retrieved", data: result });
});

const getFailedPayments = catchAsync(async (_req: Request, res: Response) => {
  const result = await AdminService.getFailedPayments();
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Failed payments retrieved", data: result });
});

const getCommissionSettings = catchAsync(async (_req: Request, res: Response) => {
  const result = await AdminService.getCommissionSettings();
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Commission settings retrieved", data: result });
});

const updateCommissionSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.updateCommissionSettings(req.body);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Commission settings updated", data: result });
});

const listCommissionEarnings = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.listCommissionEarnings(req.query as Record<string, unknown>);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Commission earnings retrieved",
    data: result.data,
    meta: result.meta,
  });
});

const getCommissionAnalytics = catchAsync(async (_req: Request, res: Response) => {
  const result = await AdminService.getCommissionAnalytics();
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Commission analytics retrieved", data: result });
});

export const AdminController = {
  getStores,
  suspendStore,
  getUsers,
  getAnalytics,
  getSubscriptions,
  getSubscription,
  overridePlan,
  getBillingAnalytics,
  getFailedPayments,
  getCommissionSettings,
  updateCommissionSettings,
  listCommissionEarnings,
  getCommissionAnalytics,
};
