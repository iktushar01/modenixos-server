import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { NewsletterService } from "./newsletter.service";
import { StoreService } from "../store/store.service";

const subscribe = catchAsync(async (req: Request, res: Response) => {
  const store = await StoreService.getPublicStoreBySlug(req.params.slug as string);
  const result = await NewsletterService.subscribe(store.id, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const confirm = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterService.confirmSubscription(req.storeId!, req.query.token as string);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: result.message, data: result });
});

const unsubscribe = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterService.unsubscribe(req.storeId!, req.query.token as string);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: result.message, data: result });
});

const getStats = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterService.getStats(req.storeId!);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Newsletter stats retrieved", data: result });
});

const getSubscribers = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterService.getSubscribers(req.storeId!, req.query as Record<string, unknown>);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Subscribers retrieved",
    data: result.data,
    meta: result.meta,
  });
});

const removeSubscriber = catchAsync(async (req: Request, res: Response) => {
  await NewsletterService.deleteSubscriber(req.storeId!, req.params.id as string);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Subscriber removed" });
});

const getSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterService.getSettings(req.storeId!);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Newsletter settings retrieved", data: result });
});

const updateSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterService.updateSettings(req.storeId!, req.body);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Newsletter settings updated", data: result });
});

const getCampaigns = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterService.getCampaigns(req.storeId!, req.query as Record<string, unknown>);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Campaigns retrieved",
    data: result.data,
    meta: result.meta,
  });
});

const getCampaign = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterService.getCampaign(req.storeId!, req.params.id as string);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Campaign retrieved", data: result });
});

const createCampaign = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterService.createCampaign(req.storeId!, req.body);
  sendResponse(res, { statusCode: StatusCodes.CREATED, success: true, message: "Campaign created", data: result });
});

const updateCampaign = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterService.updateCampaign(req.storeId!, req.params.id as string, req.body);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Campaign updated", data: result });
});

const sendCampaign = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterService.sendCampaign(req.storeId!, req.params.id as string);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Campaign sent", data: result });
});

const deleteCampaign = catchAsync(async (req: Request, res: Response) => {
  await NewsletterService.deleteCampaign(req.storeId!, req.params.id as string);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Campaign deleted" });
});

export const NewsletterController = {
  subscribe,
  confirm,
  unsubscribe,
  getStats,
  getSubscribers,
  removeSubscriber,
  getSettings,
  updateSettings,
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  sendCampaign,
  deleteCampaign,
};
