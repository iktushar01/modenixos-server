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

export const CustomerController = { getAll, getOne };
