import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { OrderService } from "./order.service";
import { StoreService } from "../store/store.service";

const createPublic = catchAsync(async (req: Request, res: Response) => {
  const store = await StoreService.getPublicStoreBySlug(req.params.slug as string);
  const result = await OrderService.createPublicOrder(store.id, req.body);
  sendResponse(res, { statusCode: StatusCodes.CREATED, success: true, message: "Order placed successfully", data: result });
});

const getAll = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.getOrders(req.storeId!, req.query as Record<string, unknown>);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Orders retrieved", data: result.data, meta: result.meta });
});

const getOne = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.getOrder(req.storeId!, req.params.id as string);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Order retrieved", data: result });
});

const updateStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.updateOrderStatus(req.storeId!, req.params.id as string, req.body.status);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Order status updated", data: result });
});

export const OrderController = { createPublic, getAll, getOne, updateStatus };
