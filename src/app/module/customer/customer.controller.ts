import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { CustomerService } from "./customer.service";

const getAll = catchAsync(async (req: Request, res: Response) => {
  const result = await CustomerService.getCustomers(req.storeId!, req.query as Record<string, unknown>);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Customers retrieved", data: result.data, meta: result.meta });
});

const getOne = catchAsync(async (req: Request, res: Response) => {
  const result = await CustomerService.getCustomer(req.storeId!, req.params.id as string);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Customer retrieved", data: result });
});

const create = catchAsync(async (req: Request, res: Response) => {
  const result = await CustomerService.createCustomer(req.storeId!, req.body);
  sendResponse(res, { statusCode: StatusCodes.CREATED, success: true, message: "Login account created", data: result });
});

const update = catchAsync(async (req: Request, res: Response) => {
  const result = await CustomerService.updateCustomer(req.storeId!, req.params.id as string, req.body);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Customer updated", data: result });
});

const remove = catchAsync(async (req: Request, res: Response) => {
  await CustomerService.deleteCustomer(req.storeId!, req.params.id as string);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Customer deleted" });
});

export const CustomerController = { getAll, getOne, create, update, remove };
