import { StatusCodes } from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { hashPassword, verifyPassword } from "../../utils/password";
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
  return sanitizeCustomer(customer);
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
  return sanitizeCustomer(customer);
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

export const StorefrontCustomerService = {
  register,
  login,
  logout,
  getMe,
};
