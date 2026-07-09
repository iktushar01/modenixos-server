import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { CategoryService } from "./category.service";

const create = catchAsync(async (req: Request, res: Response) => {
  const file = (req as any).file;
  const result = await CategoryService.createCategory(
    req.storeId!,
    req.body,
    file?.buffer,
    file?.originalname,
  );
  sendResponse(res, { statusCode: StatusCodes.CREATED, success: true, message: "Category created", data: result });
});

const getAll = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.getCategories(req.storeId!, req.query as Record<string, unknown>);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Categories retrieved",
    data: result.data,
    meta: result.meta,
  });
});

const getOne = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.getCategory(req.storeId!, req.params.id as string);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Category retrieved", data: result });
});

const update = catchAsync(async (req: Request, res: Response) => {
  const file = (req as any).file;
  const result = await CategoryService.updateCategory(
    req.storeId!,
    req.params.id as string,
    req.body,
    file?.buffer,
    file?.originalname,
  );
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Category updated", data: result });
});

const remove = catchAsync(async (req: Request, res: Response) => {
  await CategoryService.deleteCategory(req.storeId!, req.params.id as string);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Category deleted" });
});

const reorder = catchAsync(async (req: Request, res: Response) => {
  const { categoryIds } = req.body as { categoryIds: string[] };
  const result = await CategoryService.reorderCategories(req.storeId!, categoryIds);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Category order updated",
    data: result,
  });
});

export const CategoryController = { create, getAll, getOne, update, remove, reorder };
