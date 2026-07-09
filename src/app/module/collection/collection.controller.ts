import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { CollectionService } from "./collection.service";

const create = catchAsync(async (req: Request, res: Response) => {
  const file = (req as any).file;
  const result = await CollectionService.createCollection(req.storeId!, req.body, file?.buffer, file?.originalname);
  sendResponse(res, { statusCode: StatusCodes.CREATED, success: true, message: "Collection created", data: result });
});

const getAll = catchAsync(async (req: Request, res: Response) => {
  const result = await CollectionService.getCollections(req.storeId!, req.query as Record<string, unknown>);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Collections retrieved", data: result.data, meta: result.meta });
});

const getOne = catchAsync(async (req: Request, res: Response) => {
  const result = await CollectionService.getCollection(req.storeId!, req.params.id as string);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Collection retrieved", data: result });
});

const update = catchAsync(async (req: Request, res: Response) => {
  const file = (req as any).file;
  const result = await CollectionService.updateCollection(req.storeId!, req.params.id as string, req.body, file?.buffer, file?.originalname);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Collection updated", data: result });
});

const remove = catchAsync(async (req: Request, res: Response) => {
  await CollectionService.deleteCollection(req.storeId!, req.params.id as string);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Collection deleted" });
});

const reorder = catchAsync(async (req: Request, res: Response) => {
  const { collectionIds } = req.body as { collectionIds: string[] };
  const result = await CollectionService.reorderCollections(req.storeId!, collectionIds);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Collection order updated",
    data: result,
  });
});

export const CollectionController = { create, getAll, getOne, update, remove, reorder };
