import { prisma } from "../../lib/prisma";
import {
  CommissionBase,
  CommissionType,
  OrderStatus,
  PlatformEarningStatus,
} from "../../lib/prisma-exports";

const DEFAULT_SETTINGS = {
  id: "default",
  isEnabled: true,
  commissionType: CommissionType.PERCENT,
  commissionValue: 2.5,
  commissionBase: CommissionBase.SUBTOTAL,
  triggerStatus: OrderStatus.CONFIRMED,
};

const FULFILLED_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PACKED,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

const isFulfilled = (status: OrderStatus) => FULFILLED_STATUSES.includes(status);

const getSettings = async () => {
  const existing = await prisma.platformSettings.findUnique({ where: { id: "default" } });
  if (existing) return existing;

  return prisma.platformSettings.create({ data: DEFAULT_SETTINGS });
};

const getCommissionBaseAmount = (
  order: { subtotal: number; total: number },
  base: CommissionBase,
) => (base === CommissionBase.TOTAL ? order.total : order.subtotal);

const calculateCommission = (
  order: { subtotal: number; total: number },
  settings: {
    commissionType: CommissionType;
    commissionValue: number;
    commissionBase: CommissionBase;
  },
) => {
  const baseAmount = getCommissionBaseAmount(order, settings.commissionBase);
  const raw =
    settings.commissionType === CommissionType.PERCENT
      ? baseAmount * (settings.commissionValue / 100)
      : settings.commissionValue;

  return Math.round(Math.max(raw, 0) * 100) / 100;
};

const shouldRecordForStatus = (settings: { triggerStatus: OrderStatus }, newStatus: OrderStatus) => {
  if (settings.triggerStatus === OrderStatus.CONFIRMED) {
    return isFulfilled(newStatus);
  }
  return newStatus === settings.triggerStatus;
};

const recordCommissionForOrder = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { store: { select: { currency: true } }, platformEarning: true },
  });

  if (!order || !isFulfilled(order.status)) return null;

  const settings = await getSettings();
  if (!settings.isEnabled) return null;
  if (!shouldRecordForStatus(settings, order.status)) return null;

  if (order.platformEarning?.status === PlatformEarningStatus.EARNED) {
    return order.platformEarning;
  }

  const commissionAmount = calculateCommission(order, settings);
  if (commissionAmount <= 0) return null;

  const data = {
    storeId: order.storeId,
    orderNumber: order.orderNumber,
    orderAmount: getCommissionBaseAmount(order, settings.commissionBase),
    commissionRate: settings.commissionValue,
    commissionAmount,
    commissionType: settings.commissionType,
    commissionBase: settings.commissionBase,
    currency: order.store.currency,
    status: PlatformEarningStatus.EARNED,
    earnedAt: new Date(),
    reversedAt: null,
  };

  return prisma.platformEarning.upsert({
    where: { orderId },
    create: { orderId, ...data },
    update: data,
  });
};

const reverseCommissionForOrder = async (orderId: string) => {
  const earning = await prisma.platformEarning.findUnique({ where: { orderId } });
  if (!earning || earning.status === PlatformEarningStatus.REVERSED) return null;

  return prisma.platformEarning.update({
    where: { orderId },
    data: {
      status: PlatformEarningStatus.REVERSED,
      reversedAt: new Date(),
    },
  });
};

const onOrderStatusChanged = async (
  orderId: string,
  previousStatus: OrderStatus,
  newStatus: OrderStatus,
) => {
  if (newStatus === OrderStatus.CANCELLED) {
    await reverseCommissionForOrder(orderId);
    return;
  }

  const settings = await getSettings();
  if (!settings.isEnabled) return;

  const wasEligible = shouldRecordForStatus(settings, previousStatus);
  const isEligible = shouldRecordForStatus(settings, newStatus);

  if (!wasEligible && isEligible) {
    await recordCommissionForOrder(orderId);
  }
};

const updateSettings = async (payload: {
  isEnabled?: boolean;
  commissionType?: CommissionType;
  commissionValue?: number;
  commissionBase?: CommissionBase;
  triggerStatus?: OrderStatus;
}) => {
  await getSettings();
  return prisma.platformSettings.update({
    where: { id: "default" },
    data: payload,
  });
};

const listEarnings = async (query: Record<string, unknown>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const skip = (page - 1) * limit;
  const status = typeof query.status === "string" ? query.status : undefined;
  const storeId = typeof query.storeId === "string" ? query.storeId : undefined;

  const where = {
    ...(status ? { status: status as PlatformEarningStatus } : {}),
    ...(storeId ? { storeId } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.platformEarning.findMany({
      where,
      skip,
      take: limit,
      orderBy: { earnedAt: "desc" },
      include: {
        store: { select: { id: true, brandName: true, slug: true } },
        order: { select: { id: true, orderNumber: true, status: true, total: true } },
      },
    }),
    prisma.platformEarning.count({ where }),
  ]);

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

const getAnalytics = async () => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalAgg, monthAgg, reversedAgg, count] = await Promise.all([
    prisma.platformEarning.aggregate({
      where: { status: PlatformEarningStatus.EARNED },
      _sum: { commissionAmount: true },
    }),
    prisma.platformEarning.aggregate({
      where: {
        status: PlatformEarningStatus.EARNED,
        earnedAt: { gte: monthStart },
      },
      _sum: { commissionAmount: true },
    }),
    prisma.platformEarning.aggregate({
      where: { status: PlatformEarningStatus.REVERSED },
      _sum: { commissionAmount: true },
    }),
    prisma.platformEarning.count({ where: { status: PlatformEarningStatus.EARNED } }),
  ]);

  return {
    totalCommission: totalAgg._sum.commissionAmount ?? 0,
    commissionThisMonth: monthAgg._sum.commissionAmount ?? 0,
    reversedCommission: reversedAgg._sum.commissionAmount ?? 0,
    earnedOrderCount: count,
  };
};

export const CommissionService = {
  getSettings,
  updateSettings,
  recordCommissionForOrder,
  reverseCommissionForOrder,
  onOrderStatusChanged,
  listEarnings,
  getAnalytics,
  calculateCommission,
};
