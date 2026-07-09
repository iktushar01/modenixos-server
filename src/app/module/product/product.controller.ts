import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { ProductService } from "./product.service";

const create = catchAsync(async (req: Request, res: Response) => {
  const files = (req as any).files as Express.Multer.File[] | undefined;
  const result = await ProductService.createProduct(req.storeId!, req.body, files);
  sendResponse(res, { statusCode: StatusCodes.CREATED, success: true, message: "Product created", data: result });
});

const getAll = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.getProducts(req.storeId!, req.query as Record<string, unknown>);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Products retrieved", data: result.data, meta: result.meta });
});

const getOne = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.getProduct(req.storeId!, req.params.id as string);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Product retrieved", data: result });
});

const update = catchAsync(async (req: Request, res: Response) => {
  const files = (req as any).files as Express.Multer.File[] | undefined;
  const result = await ProductService.updateProduct(req.storeId!, req.params.id as string, req.body, files);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Product updated", data: result });
});

const remove = catchAsync(async (req: Request, res: Response) => {
  await ProductService.deleteProduct(req.storeId!, req.params.id as string);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Product deleted" });
});

const reorder = catchAsync(async (req: Request, res: Response) => {
  const { productIds } = req.body as { productIds: string[] };
  const result = await ProductService.reorderProducts(req.storeId!, productIds);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Product order updated",
    data: result,
  });
});

export const ProductController = { create, getAll, getOne, update, remove, reorder };
