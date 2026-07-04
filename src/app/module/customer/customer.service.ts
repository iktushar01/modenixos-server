import { StatusCodes } from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/QueryBuilder";

const getCustomers = async (storeId: string, query: Record<string, unknown>) => {
  return new QueryBuilder(prisma.customer as any, query, {
    searchableFields: ["name", "email", "phone"],
  })
    .where({ storeId })
    .search()
    .sort()
    .paginate()
    .execute();
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

  return { ...customer, orders };
};

export const CustomerService = { getCustomers, getCustomer };
