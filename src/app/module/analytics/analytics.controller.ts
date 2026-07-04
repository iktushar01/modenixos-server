import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { AnalyticsService } from "./analytics.service";

const getOverview = catchAsync(async (req: Request, res: Response) => {
  const result = await AnalyticsService.getOverview(req.storeId!);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Overview retrieved", data: result });
});

const getCharts = catchAsync(async (req: Request, res: Response) => {
  const result = await AnalyticsService.getCharts(req.storeId!);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Charts retrieved", data: result });
});

export const AnalyticsController = { getOverview, getCharts };
