import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../errorHelpers/AppError";
import { cookieUtils } from "../utils/cookies";
import {
  storefrontCustomerCookieName,
  verifyStorefrontCustomerToken,
} from "../utils/storefrontCustomerToken";

function attachStorefrontCustomer(req: Request, slug: string): boolean {
  const token = cookieUtils.getCookie(req, storefrontCustomerCookieName(slug));
  if (!token) return false;

  const verified = verifyStorefrontCustomerToken(token);
  if (!verified.success || !verified.decoded) return false;

  const { customerId, storeId, slug: tokenSlug } = verified.decoded as {
    customerId: string;
    storeId: string;
    slug: string;
  };

  if (tokenSlug !== slug) return false;

  req.storefrontCustomerId = customerId;
  req.storefrontCustomerStoreId = storeId;
  return true;
}

/** Sets storefront customer on the request when a valid session cookie exists. */
export const optionalStorefrontCustomer = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const slug = req.params.slug as string;
  if (slug) {
    attachStorefrontCustomer(req, slug);
  }
  next();
};

export const requireStorefrontCustomer = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const slug = req.params.slug as string;
  if (!slug) {
    return next(new AppError(StatusCodes.BAD_REQUEST, "Store slug required"));
  }

  if (!attachStorefrontCustomer(req, slug)) {
    return next(new AppError(StatusCodes.UNAUTHORIZED, "Please log in to continue"));
  }

  next();
};
