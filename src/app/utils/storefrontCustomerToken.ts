import type { Response } from "express";
import { envVars } from "../../config/env";
import { jwtUtils } from "./jwt";
import { cookieUtils } from "./cookies";

const COOKIE_PREFIX = "sf_customer_";
const TOKEN_EXPIRES = "30d";

export const storefrontCustomerCookieName = (slug: string) =>
  `${COOKIE_PREFIX}${slug.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

export interface StorefrontCustomerTokenPayload {
  customerId: string;
  storeId: string;
  slug: string;
}

export const createStorefrontCustomerToken = (payload: StorefrontCustomerTokenPayload) =>
  jwtUtils.createToken(payload, envVars.ACCESS_TOKEN_SECRET, { expiresIn: TOKEN_EXPIRES });

export const verifyStorefrontCustomerToken = (token: string) =>
  jwtUtils.verifyToken(token, envVars.ACCESS_TOKEN_SECRET);

export const setStorefrontCustomerCookie = (
  res: Response,
  slug: string,
  token: string,
) => {
  const isProd = envVars.NODE_ENV === "production";
  cookieUtils.setCookie(res, storefrontCustomerCookieName(slug), token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
};

export const clearStorefrontCustomerCookie = (res: Response, slug: string) => {
  const isProd = envVars.NODE_ENV === "production";
  cookieUtils.clearCookie(res, storefrontCustomerCookieName(slug), {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  });
};
