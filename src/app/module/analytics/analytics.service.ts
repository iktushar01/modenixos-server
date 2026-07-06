import { prisma } from "../../lib/prisma";
import { OrderStatus, ProductStatus } from "../../lib/prisma-exports";
import { assertAdvancedAnalytics } from "../../utils/planEnforcement";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function getPeriodMetrics(storeId: string, from: Date, to: Date) {
  const orderWhere = {
    storeId,
    status: { not: OrderStatus.CANCELLED },
    createdAt: { gte: from, lt: to },
  };

  const [revenueAgg, orders, newCustomers] = await Promise.all([
    prisma.order.aggregate({
      where: orderWhere,
      _sum: { total: true },
    }),
    prisma.order.count({ where: orderWhere }),
    prisma.customer.count({
      where: { storeId, createdAt: { gte: from, lt: to } },
    }),
  ]);

  const revenue = revenueAgg._sum.total ?? 0;
  const aov = orders > 0 ? revenue / orders : 0;

  return { revenue, orders, newCustomers, aov };
}

const getOverview = async (storeId: string) => {
  const now = new Date();
  const periodStart = new Date(now.getTime() - 30 * MS_PER_DAY);
  const previousPeriodStart = new Date(now.getTime() - 60 * MS_PER_DAY);

  const [
    orders,
    products,
    customers,
    revenueAgg,
    recentOrders,
    topProducts,
    currentPeriod,
    previousPeriod,
    statusGroups,
  ] = await Promise.all([
    prisma.order.count({ where: { storeId } }),
    prisma.product.count({ where: { storeId, status: ProductStatus.ACTIVE } }),
    prisma.customer.count({ where: { storeId } }),
    prisma.order.aggregate({
      where: { storeId, status: { not: OrderStatus.CANCELLED } },
      _sum: { total: true },
    }),
    prisma.order.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.order.findMany({
      where: {
        storeId,
        status: { not: OrderStatus.CANCELLED },
        createdAt: { gte: new Date(now.getTime() - 90 * MS_PER_DAY) },
      },
      select: { items: true },
      take: 500,
    }),
    getPeriodMetrics(storeId, periodStart, now),
    getPeriodMetrics(storeId, previousPeriodStart, periodStart),
    prisma.order.groupBy({
      by: ["status"],
      where: { storeId },
      _count: { _all: true },
    }),
  ]);

  const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
  for (const order of topProducts) {
    const items = order.items as Array<{ productId: string; name: string; price: number; quantity: number }>;
    for (const item of items) {
      if (!productSales[item.productId]) {
        productSales[item.productId] = { name: item.name, quantity: 0, revenue: 0 };
      }
      const entry = productSales[item.productId]!;
      entry.quantity += item.quantity;
      entry.revenue += item.price * item.quantity;
    }
  }

  const bestSellers = Object.entries(productSales)
    .map(([productId, data]) => ({ productId, ...data }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  const totalBestSellerRevenue = bestSellers.reduce((sum, item) => sum + item.revenue, 0);
  const bestSellersWithShare = bestSellers.map((item) => ({
    ...item,
    share:
      totalBestSellerRevenue > 0
        ? Math.round((item.revenue / totalBestSellerRevenue) * 1000) / 10
        : 0,
  }));

  const lifetimeAov =
    orders > 0 ? (revenueAgg._sum.total ?? 0) / orders : 0;

  return {
    revenue: revenueAgg._sum.total ?? 0,
    orders,
    products,
    customers,
    recentOrders,
    bestSellers: bestSellersWithShare,
    period: {
      label: "Last 30 days",
      ...currentPeriod,
    },
    previousPeriod: {
      label: "Prior 30 days",
      ...previousPeriod,
    },
    changes: {
      revenue: pctChange(currentPeriod.revenue, previousPeriod.revenue),
      orders: pctChange(currentPeriod.orders, previousPeriod.orders),
      newCustomers: pctChange(currentPeriod.newCustomers, previousPeriod.newCustomers),
      aov: pctChange(currentPeriod.aov, previousPeriod.aov),
    },
    aov: lifetimeAov,
    orderStatusBreakdown: statusGroups.map((group) => ({
      status: group.status,
      count: group._count._all,
    })),
  };
};

const getCharts = async (storeId: string) => {
  await assertAdvancedAnalytics(storeId);

  const now = new Date();
  const since12m = new Date(now);
  since12m.setMonth(since12m.getMonth() - 12);

  const since30d = new Date(now.getTime() - 30 * MS_PER_DAY);

  const orders = await prisma.order.findMany({
    where: {
      storeId,
      status: { not: OrderStatus.CANCELLED },
      createdAt: { gte: since12m },
    },
    select: { total: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const monthlyRevenue: Record<string, number> = {};
  const monthlyOrders: Record<string, number> = {};
  const dailyRevenue: Record<string, number> = {};

  for (const order of orders) {
    const month = monthKey(order.createdAt);
    monthlyRevenue[month] = (monthlyRevenue[month] ?? 0) + order.total;
    monthlyOrders[month] = (monthlyOrders[month] ?? 0) + 1;

    if (order.createdAt >= since30d) {
      const day = dayKey(order.createdAt);
      dailyRevenue[day] = (dailyRevenue[day] ?? 0) + order.total;
    }
  }

  const formatMonthLabel = (key: string) => {
    const [year, month] = key.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  };

  const formatDayLabel = (key: string) => {
    const date = new Date(`${key}T12:00:00`);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const buildMonthlySeries = (values: Record<string, number>, valueKey: "revenue" | "orders") => {
    const series = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      series.push({
        month: key,
        label: formatMonthLabel(key),
        [valueKey]: values[key] ?? 0,
      });
    }
    return series;
  };

  const buildDailySeries = (values: Record<string, number>) => {
    const series = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = dayKey(d);
      series.push({
        day: key,
        label: formatDayLabel(key),
        revenue: values[key] ?? 0,
      });
    }
    return series;
  };

  return {
    monthlyRevenue: buildMonthlySeries(monthlyRevenue, "revenue"),
    monthlyOrders: buildMonthlySeries(monthlyOrders, "orders"),
    dailyRevenue: buildDailySeries(dailyRevenue),
    totalOrders: orders.length,
  };
};

export const AnalyticsService = { getOverview, getCharts };
