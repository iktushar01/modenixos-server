import { StatusCodes } from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/QueryBuilder";

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

const getCustomers = async (storeId: string, query: Record<string, unknown>) => {
  const result = await new QueryBuilder(prisma.customer as any, query, {
    searchableFields: ["name", "email", "phone"],
  })
    .where({ storeId })
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

export const CustomerService = { getCustomers, getCustomer };
