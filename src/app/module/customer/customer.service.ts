import { StatusCodes } from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { hashPassword } from "../../utils/password";

type CustomerRecord = {
  id: string;
  storeId: string;
  email: string;
  name: string;
  phone: string | null;
  passwordHash: string | null;
  orderCount: number;
  totalSpent: number;
  createdAt: Date;
};

const toPublicCustomer = (customer: CustomerRecord) => {
  const { passwordHash, ...rest } = customer;
  return {
    ...rest,
    hasAccount: Boolean(passwordHash),
    createdAt: customer.createdAt.toISOString(),
  };
};

const buildAccountFilter = (query: Record<string, unknown>) => {
  const { hasAccount, ...rest } = query;
  const extraWhere: Record<string, unknown> = {};

  if (hasAccount === "true") {
    extraWhere.passwordHash = { not: null };
  } else if (hasAccount === "false") {
    extraWhere.passwordHash = null;
  }

  return { restQuery: rest, extraWhere };
};

const getCustomers = async (storeId: string, query: Record<string, unknown>) => {
  const { restQuery, extraWhere } = buildAccountFilter(query);

  const result = await new QueryBuilder(prisma.customer as any, restQuery, {
    searchableFields: ["name", "email", "phone"],
  })
    .where({ storeId, ...extraWhere })
    .search()
    .sort()
    .paginate()
    .execute();

  return {
    ...result,
    data: (result.data as CustomerRecord[]).map(toPublicCustomer),
  };
};

const getCustomer = async (storeId: string, id: string) => {
  const customer = await prisma.customer.findFirst({
    where: { id, storeId },
  });
  if (!customer) throw new AppError(StatusCodes.NOT_FOUND, "Customer not found");

  const orders = await prisma.order.findMany({
    where: { storeId, customerEmail: customer.email },
    orderBy: { createdAt: "desc" },
  });

  return { ...toPublicCustomer(customer as CustomerRecord), orders };
};

const createCustomer = async (
  storeId: string,
  payload: { name: string; email: string; password: string; phone?: string | null },
) => {
  const email = payload.email.toLowerCase();
  const existing = await prisma.customer.findUnique({
    where: { storeId_email: { storeId, email } },
  });

  if (existing?.passwordHash) {
    throw new AppError(StatusCodes.CONFLICT, "A login account with this email already exists");
  }

  const passwordHash = hashPassword(payload.password);
  const customer = existing
    ? await prisma.customer.update({
        where: { id: existing.id },
        data: {
          name: payload.name,
          phone: payload.phone ?? existing.phone,
          passwordHash,
        },
      })
    : await prisma.customer.create({
        data: {
          storeId,
          email,
          name: payload.name,
          phone: payload.phone ?? null,
          passwordHash,
        },
      });

  return toPublicCustomer(customer as CustomerRecord);
};

const updateCustomer = async (
  storeId: string,
  id: string,
  payload: {
    name?: string;
    email?: string;
    phone?: string | null;
    password?: string;
    removeAccount?: boolean;
  },
) => {
  const customer = await prisma.customer.findFirst({ where: { id, storeId } });
  if (!customer) throw new AppError(StatusCodes.NOT_FOUND, "Customer not found");

  const data: Record<string, unknown> = {};

  if (payload.name !== undefined) data.name = payload.name;
  if (payload.phone !== undefined) data.phone = payload.phone;

  if (payload.email !== undefined) {
    const email = payload.email.toLowerCase();
    if (email !== customer.email) {
      const taken = await prisma.customer.findUnique({
        where: { storeId_email: { storeId, email } },
      });
      if (taken && taken.id !== id) {
        throw new AppError(StatusCodes.CONFLICT, "Another customer already uses this email");
      }
      data.email = email;
    }
  }

  if (payload.removeAccount) {
    data.passwordHash = null;
  } else if (payload.password) {
    data.passwordHash = hashPassword(payload.password);
  }

  const updated = await prisma.customer.update({
    where: { id },
    data,
  });

  return toPublicCustomer(updated as CustomerRecord);
};

const deleteCustomer = async (storeId: string, id: string) => {
  const customer = await prisma.customer.findFirst({ where: { id, storeId } });
  if (!customer) throw new AppError(StatusCodes.NOT_FOUND, "Customer not found");

  await prisma.customer.delete({ where: { id } });
};

export const CustomerService = {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
