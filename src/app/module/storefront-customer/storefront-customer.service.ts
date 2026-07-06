import { StatusCodes } from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { hashPassword, verifyPassword } from "../../utils/password";
import {
  sendStorefrontCustomerOtp,
  verifyStorefrontCustomerOtp,
} from "../../utils/storefrontCustomerOtp";
import {
  createStorefrontCustomerToken,
  setStorefrontCustomerCookie,
  clearStorefrontCustomerCookie,
} from "../../utils/storefrontCustomerToken";
import { Response } from "express";

const sanitizeCustomer = (customer: {
  id: string;
  storeId: string;
  email: string;
  name: string;
  phone: string | null;
}) => ({
  id: customer.id,
  storeId: customer.storeId,
  email: customer.email,
  name: customer.name,
  phone: customer.phone,
});

const register = async (
  storeId: string,
  slug: string,
  payload: { name: string; email: string; password: string },
  res: Response,
) => {
  const email = payload.email.toLowerCase();
  const existing = await prisma.customer.findUnique({
    where: { storeId_email: { storeId, email } },
  });

  if (existing?.passwordHash) {
    throw new AppError(StatusCodes.CONFLICT, "An account with this email already exists");
  }

  const passwordHash = hashPassword(payload.password);
  const customer = existing
    ? await prisma.customer.update({
        where: { id: existing.id },
        data: { name: payload.name, passwordHash },
      })
    : await prisma.customer.create({
        data: {
          storeId,
          email,
          name: payload.name,
          passwordHash,
        },
      });

  const token = createStorefrontCustomerToken({ customerId: customer.id, storeId, slug });
  setStorefrontCustomerCookie(res, slug, token);
  return { customer: sanitizeCustomer(customer), token };
};

const login = async (
  storeId: string,
  slug: string,
  payload: { email: string; password: string },
  res: Response,
) => {
  const email = payload.email.toLowerCase();
  const customer = await prisma.customer.findUnique({
    where: { storeId_email: { storeId, email } },
  });

  if (!customer?.passwordHash || !verifyPassword(payload.password, customer.passwordHash)) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid email or password");
  }

  const token = createStorefrontCustomerToken({ customerId: customer.id, storeId, slug });
  setStorefrontCustomerCookie(res, slug, token);
  return { customer: sanitizeCustomer(customer), token };
};

const logout = (slug: string, res: Response) => {
  clearStorefrontCustomerCookie(res, slug);
};

const getMe = async (storeId: string, customerId: string) => {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, storeId },
  });
  if (!customer) throw new AppError(StatusCodes.NOT_FOUND, "Customer not found");
  return sanitizeCustomer(customer);
};

const sendOtp = async (
  storeId: string,
  storeName: string,
  payload: { email: string; purpose: "login" | "register"; name?: string },
) => {
  await sendStorefrontCustomerOtp(
    storeId,
    storeName,
    payload.email,
    payload.purpose,
    payload.name,
  );
};

const verifyOtp = async (
  storeId: string,
  slug: string,
  payload: { email: string; otp: string },
  res: Response,
) => {
  const email = payload.email.toLowerCase().trim();
  const { purpose, name } = await verifyStorefrontCustomerOtp(storeId, email, payload.otp);

  let customer = await prisma.customer.findUnique({
    where: { storeId_email: { storeId, email } },
  });

  if (purpose === "register") {
    customer = customer
      ? await prisma.customer.update({
          where: { id: customer.id },
          data: { name: name ?? customer.name },
        })
      : await prisma.customer.create({
          data: { storeId, email, name: name ?? email.split("@")[0] },
        });
  } else if (!customer) {
    throw new AppError(StatusCodes.NOT_FOUND, "Customer not found");
  }

  const token = createStorefrontCustomerToken({
    customerId: customer!.id,
    storeId,
    slug,
  });
  setStorefrontCustomerCookie(res, slug, token);
  return { customer: sanitizeCustomer(customer!), token };
};

export const StorefrontCustomerService = {
  register,
  login,
  logout,
  getMe,
  sendOtp,
  verifyOtp,
};
