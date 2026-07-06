import { prisma } from "../../lib/prisma";
import { OrderStatus, StorePlan } from "../../lib/prisma-exports";
import { PLAN_MRR } from "../../../config/planLimits";
import { BillingService } from "../billing/billing.service";
import { CommissionService } from "../commission/commission.service";

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
        subscription: true,
        _count: { select: { products: true, orders: true } },
      },
    }),
    prisma.store.count(),
  ]);

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

const getAllStoresWithMrr = async (query: Record<string, unknown>) => {
  const result = await getAllStores(query);
  const data = result.data.map((store) => ({
    ...store,
    mrr: PLAN_MRR[store.plan as StorePlan] ?? 0,
    subscriptionStatus: store.subscription?.status ?? "ACTIVE",
  }));
  return { data, meta: result.meta };
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
  const [stores, users, orders, revenueAgg, billing] = await Promise.all([
    prisma.store.count(),
    prisma.user.count({ where: { isDeleted: false } }),
    prisma.order.count(),
    prisma.order.aggregate({
      where: { status: { not: OrderStatus.CANCELLED } },
      _sum: { total: true },
    }),
    BillingService.adminBillingAnalytics(),
  ]);

  return {
    stores,
    users,
    orders,
    revenue: revenueAgg._sum.total ?? 0,
    ...billing,
  };
};

export const AdminService = {
  getAllStores: getAllStoresWithMrr,
  suspendStore,
  getAllUsers,
  getPlatformAnalytics,
  listSubscriptions: BillingService.adminListSubscriptions,
  getSubscription: BillingService.adminGetSubscription,
  overridePlan: BillingService.adminOverridePlan,
  getBillingAnalytics: BillingService.adminBillingAnalytics,
  getFailedPayments: BillingService.adminFailedPayments,
};
