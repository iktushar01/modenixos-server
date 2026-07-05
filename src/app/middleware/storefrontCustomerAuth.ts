import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../errorHelpers/AppError";
import { cookieUtils } from "../utils/cookies";
import {
  storefrontCustomerCookieName,
  verifyStorefrontCustomerToken,
} from "../utils/storefrontCustomerToken";

export const requireStorefrontCustomer = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const slug = req.params.slug as string;
  if (!slug) {
    return next(new AppError(StatusCodes.BAD_REQUEST, "Store slug required"));
  }

  const token = cookieUtils.getCookie(req, storefrontCustomerCookieName(slug));
  if (!token) {
    return next(new AppError(StatusCodes.UNAUTHORIZED, "Please log in to continue"));
  }

  const verified = verifyStorefrontCustomerToken(token);
  if (!verified.success || !verified.decoded) {
    return next(new AppError(StatusCodes.UNAUTHORIZED, "Session expired. Please log in again"));
  }

  const { customerId, storeId, slug: tokenSlug } = verified.decoded as {
    customerId: string;
    storeId: string;
    slug: string;
  };

  if (tokenSlug !== slug) {
    return next(new AppError(StatusCodes.UNAUTHORIZED, "Invalid session"));
  }

  req.storefrontCustomerId = customerId;
  req.storefrontCustomerStoreId = storeId;
  next();
};
