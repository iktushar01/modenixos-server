import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { PaymentService } from "./payment.service";
import { StoreService } from "../store/store.service";

const parseCallbackPayload = (req: Request) => {
  const body = (req.body ?? {}) as Record<string, string>;
  const query = (req.query ?? {}) as Record<string, string>;
  return { ...query, ...body };
};

const createPayment = catchAsync(async (req: Request, res: Response) => {
  const store = await StoreService.getPublicStoreBySlug(req.params.slug as string);
  const result = await PaymentService.createSslCommerzCheckout(store.id, store.slug, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Payment session created",
    data: result,
  });
});

const successCallback = catchAsync(async (req: Request, res: Response) => {
  const payload = parseCallbackPayload(req);
  const { redirectUrl } = await PaymentService.processSuccessCallback(payload);
  res.redirect(redirectUrl);
});

const failCallback = catchAsync(async (req: Request, res: Response) => {
  const payload = parseCallbackPayload(req);
  const { redirectUrl } = await PaymentService.processFailCallback(payload);
  res.redirect(redirectUrl);
});

const cancelCallback = catchAsync(async (req: Request, res: Response) => {
  const payload = parseCallbackPayload(req);
  const { redirectUrl } = await PaymentService.processCancelCallback(payload);
  res.redirect(redirectUrl);
});

const ipnCallback = catchAsync(async (req: Request, res: Response) => {
  const payload = parseCallbackPayload(req);
  const result = await PaymentService.processIpnCallback(payload);
  res.status(StatusCodes.OK).json(result);
});

export const PaymentController = {
  createPayment,
  successCallback,
  failCallback,
  cancelCallback,
  ipnCallback,
};
