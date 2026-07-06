import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { BillingService } from "./billing.service";
import { isStripeConfigured, stripe, stripeConfig } from "../../../config/stripe.config";
import AppError from "../../errorHelpers/AppError";

const getOverview = catchAsync(async (req: Request, res: Response) => {
  const result = await BillingService.getOverview(req.storeId!);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Billing overview retrieved", data: result });
});

const getPlans = catchAsync(async (_req: Request, res: Response) => {
  const result = BillingService.getPlans();
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Plans retrieved", data: result });
});

const createCheckout = catchAsync(async (req: Request, res: Response) => {
  const result = await BillingService.createCheckoutSession(req.storeId!, {
    email: req.user!.email,
    name: req.user!.name,
  }, req.body.plan);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Checkout session created", data: result });
});

const createPortal = catchAsync(async (req: Request, res: Response) => {
  const result = await BillingService.createPortalSession(req.storeId!, {
    email: req.user!.email,
    name: req.user!.name,
  });
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Portal session created", data: result });
});

const cancel = catchAsync(async (req: Request, res: Response) => {
  const result = await BillingService.cancelSubscription(req.storeId!);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: result.message, data: result });
});

const webhook = catchAsync(async (req: Request, res: Response) => {
  if (!isStripeConfigured || !stripe) {
    throw new AppError(StatusCodes.SERVICE_UNAVAILABLE, "Stripe is not configured");
  }

  const signature = req.headers["stripe-signature"];
  if (!signature || !stripeConfig.webhookSecret) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Missing Stripe webhook signature");
  }

  const event = stripe.webhooks.constructEvent(req.body, signature, stripeConfig.webhookSecret);
  await BillingService.handleWebhookEvent(event);
  res.status(StatusCodes.OK).json({ received: true });
});

export const BillingController = {
  getOverview,
  getPlans,
  createCheckout,
  createPortal,
  cancel,
  webhook,
};
