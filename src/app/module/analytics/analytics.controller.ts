import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { parseAnalyticsRange } from "./analytics.date-range";
import { AnalyticsService } from "./analytics.service";
import { StorefrontEventService } from "./storefront-event.service";

const getOverview = catchAsync(async (req: Request, res: Response) => {
  const range = parseAnalyticsRange(req.query.range as string | undefined);
  const result = await AnalyticsService.getOverview(req.storeId!, range);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Overview retrieved",
    data: result,
  });
});

const getCharts = catchAsync(async (req: Request, res: Response) => {
  const range = parseAnalyticsRange(req.query.range as string | undefined);
  const result = await AnalyticsService.getCharts(req.storeId!, range);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Charts retrieved",
    data: result,
  });
});

const trackStorefrontEvent = catchAsync(async (req: Request, res: Response) => {
  const result = await StorefrontEventService.trackEvent(req.storeId!, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Event recorded",
    data: result,
  });
});

export const AnalyticsController = { getOverview, getCharts, trackStorefrontEvent };
