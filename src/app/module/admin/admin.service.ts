import { prisma } from "../../lib/prisma";
import { OrderStatus } from "../../lib/prisma-exports";

const getAllStores = async (query: Record<string, unknown>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.store.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { products: true, orders: true } },
      },
    }),
    prisma.store.count(),
  ]);

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

const suspendStore = async (storeId: string, isSuspended: boolean) => {
  return prisma.store.update({ where: { id: storeId }, data: { isSuspended } });
};

const getAllUsers = async (query: Record<string, unknown>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      where: { isDeleted: false },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        store: { select: { id: true, brandName: true, slug: true } },
      },
    }),
    prisma.user.count({ where: { isDeleted: false } }),
  ]);

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

const getPlatformAnalytics = async () => {
  const [stores, users, orders, revenueAgg] = await Promise.all([
    prisma.store.count(),
    prisma.user.count({ where: { isDeleted: false } }),
    prisma.order.count(),
    prisma.order.aggregate({
      where: { status: { not: OrderStatus.CANCELLED } },
      _sum: { total: true },
    }),
  ]);

  return {
    stores,
    users,
    orders,
    revenue: revenueAgg._sum.total ?? 0,
  };
};

export const AdminService = { getAllStores, suspendStore, getAllUsers, getPlatformAnalytics };
