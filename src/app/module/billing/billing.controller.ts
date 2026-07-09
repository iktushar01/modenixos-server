import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { BillingService } from "./billing.service";
import { SslCommerzBillingService } from "./sslcommerz-billing.service";
import { isStripeConfigured, stripe, stripeConfig } from "../../../config/stripe.config";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";

const resolveBillingOwner = async (req: Request) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  if (!user?.email) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Account email is required for billing.");
  }

  return {
    email: user.email,
    name: user.name || user.email.split("@")[0] || "Store Owner",
  };
};

const getOverview = catchAsync(async (req: Request, res: Response) => {
  const result = await BillingService.getOverview(req.storeId!);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Billing overview retrieved", data: result });
});

const getPlans = catchAsync(async (_req: Request, res: Response) => {
  const result = BillingService.getPlans();
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Plans retrieved", data: result });
});

const createCheckout = catchAsync(async (req: Request, res: Response) => {
  const owner = await resolveBillingOwner(req);
  const result = await BillingService.createCheckoutSession(
    req.storeId!,
    owner,
    req.body.plan,
    req.body.provider ?? "STRIPE",
    req.body.interval ?? "MONTHLY",
  );
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: "Checkout session created", data: result });
});

const startTrial = catchAsync(async (req: Request, res: Response) => {
  const result = await BillingService.startFreeTrial(req.storeId!);
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: result.message, data: result });
});

const parseCallbackPayload = (req: Request) => {
  const body = (req.body ?? {}) as Record<string, string>;
  const query = (req.query ?? {}) as Record<string, string>;
  return { ...query, ...body };
};

const sslSuccessCallback = catchAsync(async (req: Request, res: Response) => {
  const { redirectUrl } = await SslCommerzBillingService.processSuccessCallback(parseCallbackPayload(req));
  res.redirect(redirectUrl);
});

const sslFailCallback = catchAsync(async (req: Request, res: Response) => {
  const { redirectUrl } = await SslCommerzBillingService.processFailCallback(parseCallbackPayload(req));
  res.redirect(redirectUrl);
});

const sslCancelCallback = catchAsync(async (req: Request, res: Response) => {
  const { redirectUrl } = await SslCommerzBillingService.processCancelCallback(parseCallbackPayload(req));
  res.redirect(redirectUrl);
});

const sslIpnCallback = catchAsync(async (req: Request, res: Response) => {
  const result = await SslCommerzBillingService.processIpnCallback(parseCallbackPayload(req));
  res.status(StatusCodes.OK).json(result);
});

const createPortal = catchAsync(async (req: Request, res: Response) => {
  const owner = await resolveBillingOwner(req);
  const result = await BillingService.createPortalSession(req.storeId!, owner);
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
  startTrial,
  webhook,
  sslSuccessCallback,
  sslFailCallback,
  sslCancelCallback,
  sslIpnCallback,
};
