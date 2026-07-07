import { prisma } from "../../lib/prisma";
import { OrderStatus, ProductStatus } from "../../lib/prisma-exports";
import { PLAN_LIMITS, normalizeStorePlan } from "../../../config/planLimits";
import { getStorePlan } from "../../utils/planEnforcement";
import {
  AnalyticsRangeKey,
  dayKey,
  monthKey,
  parseAnalyticsRange,
  pctChange,
  resolveDateRange,
} from "./analytics.date-range";
import { StorefrontEventService } from "./storefront-event.service";

type StatusHistoryEntry = { status: string; at: string };

async function getPeriodMetrics(storeId: string, from: Date, to: Date) {
  const orderWhere = {
    storeId,
    status: { not: OrderStatus.CANCELLED },
    createdAt: { gte: from, lt: to },
  };

  const [revenueAgg, orders, newCustomers, visitors] = await Promise.all([
    prisma.order.aggregate({
      where: orderWhere,
      _sum: { total: true },
    }),
    prisma.order.count({ where: orderWhere }),
    prisma.customer.count({
      where: { storeId, createdAt: { gte: from, lt: to } },
    }),
    StorefrontEventService.countUniqueVisitors(storeId, from, to),
  ]);

  const revenue = revenueAgg._sum.total ?? 0;
  const aov = orders > 0 ? revenue / orders : 0;
  const conversionRate = visitors > 0 ? Math.round((orders / visitors) * 1000) / 10 : null;

  return { revenue, orders, newCustomers, aov, visitors, conversionRate };
}

async function getTopCustomers(storeId: string, from: Date, to: Date) {
  const orders = await prisma.order.findMany({
    where: {
      storeId,
      status: { not: OrderStatus.CANCELLED },
      createdAt: { gte: from, lt: to },
    },
    select: {
      customerEmail: true,
      customerName: true,
      total: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const byEmail = new Map<
    string,
    { email: string; name: string; orderCount: number; revenue: number; lastOrderAt: string }
  >();

  for (const order of orders) {
    const key = order.customerEmail.toLowerCase();
    const existing = byEmail.get(key);
    if (!existing) {
      byEmail.set(key, {
        email: order.customerEmail,
        name: order.customerName,
        orderCount: 1,
        revenue: order.total,
        lastOrderAt: order.createdAt.toISOString(),
      });
      continue;
    }
    existing.orderCount += 1;
    existing.revenue += order.total;
    if (order.createdAt.toISOString() > existing.lastOrderAt) {
      existing.lastOrderAt = order.createdAt.toISOString();
      existing.name = order.customerName;
    }
  }

  return [...byEmail.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
}

async function getPaymentMethodBreakdown(storeId: string, from: Date, to: Date) {
  const groups = await prisma.order.groupBy({
    by: ["paymentMethod"],
    where: {
      storeId,
      status: { not: OrderStatus.CANCELLED },
      createdAt: { gte: from, lt: to },
    },
    _count: { _all: true },
    _sum: { total: true },
  });

  return groups
    .map((group) => ({
      method: group.paymentMethod,
      count: group._count._all,
      revenue: group._sum.total ?? 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

async function getGeoBreakdown(storeId: string, from: Date, to: Date) {
  const orders = await prisma.order.findMany({
    where: {
      storeId,
      status: { not: OrderStatus.CANCELLED },
      createdAt: { gte: from, lt: to },
    },
    select: { shippingAddress: true, total: true },
    take: 1000,
  });

  const byCountry = new Map<string, { country: string; orders: number; revenue: number }>();

  for (const order of orders) {
    const address = order.shippingAddress as { country?: string } | null;
    const country = (address?.country?.trim() || "Unknown").slice(0, 64);
    const entry = byCountry.get(country) ?? { country, orders: 0, revenue: 0 };
    entry.orders += 1;
    entry.revenue += order.total;
    byCountry.set(country, entry);
  }

  return [...byCountry.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
}

async function getMarketingStats(storeId: string, from: Date, to: Date) {
  const orderWhere = {
    storeId,
    status: { not: OrderStatus.CANCELLED },
    createdAt: { gte: from, lt: to },
    couponCode: { not: null },
  };

  const [couponOrders, discountAgg, newsletterSubscribers, newsletterCampaignsSent] =
    await Promise.all([
      prisma.order.count({ where: orderWhere }),
      prisma.order.aggregate({
        where: orderWhere,
        _sum: { discount: true },
      }),
      prisma.newsletterSubscriber.count({
        where: { storeId, status: "ACTIVE", subscribedAt: { gte: from, lt: to } },
      }),
      prisma.newsletterSend.count({
        where: {
          campaign: { storeId },
          status: "SENT",
          sentAt: { gte: from, lt: to },
        },
      }),
    ]);

  const [totalSubscribers, totalCampaigns] = await Promise.all([
    prisma.newsletterSubscriber.count({ where: { storeId, status: "ACTIVE" } }),
    prisma.newsletterCampaign.count({ where: { storeId } }),
  ]);

  return {
    couponRedemptions: couponOrders,
    couponDiscountTotal: discountAgg._sum.discount ?? 0,
    newsletterSubscribersNew: newsletterSubscribers,
    newsletterCampaignsSent,
    newsletterSubscribersTotal: totalSubscribers,
    newsletterCampaignsTotal: totalCampaigns,
  };
}

async function getFulfillmentStats(storeId: string, from: Date, to: Date) {
  const orders = await prisma.order.findMany({
    where: {
      storeId,
      status: { in: [OrderStatus.SHIPPED, OrderStatus.DELIVERED] },
      createdAt: { gte: from, lt: to },
    },
    select: { createdAt: true, statusHistory: true },
    take: 200,
  });

  const durations: number[] = [];

  for (const order of orders) {
    const history = Array.isArray(order.statusHistory)
      ? (order.statusHistory as StatusHistoryEntry[])
      : [];
    const placedAt = order.createdAt.getTime();
    const shipped = history.find((entry) => entry.status === OrderStatus.SHIPPED);
    if (shipped?.at) {
      const shippedAt = new Date(shipped.at).getTime();
      if (shippedAt > placedAt) {
        durations.push((shippedAt - placedAt) / (1000 * 60 * 60));
      }
    }
  }

  const avgHoursToShip =
    durations.length > 0
      ? Math.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) * 10) / 10
      : null;

  return {
    shippedOrders: orders.length,
    avgHoursToShip,
  };
}

function buildBestSellers(
  topProducts: Array<{ items: unknown }>,
  limit = 8,
) {
  const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
  for (const order of topProducts) {
    const items = order.items as Array<{
      productId: string;
      name: string;
      price: number;
      quantity: number;
    }>;
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
    .slice(0, limit);

  const totalBestSellerRevenue = bestSellers.reduce((sum, item) => sum + item.revenue, 0);
  return bestSellers.map((item) => ({
    ...item,
    share:
      totalBestSellerRevenue > 0
        ? Math.round((item.revenue / totalBestSellerRevenue) * 1000) / 10
        : 0,
  }));
}

const getOverview = async (storeId: string, rangeKey: AnalyticsRangeKey = "30d") => {
  const plan = await getStorePlan(storeId);
  const advancedAnalytics = PLAN_LIMITS[normalizeStorePlan(plan)].advancedAnalytics;
  const effectiveRange =
    rangeKey === "90d" && !advancedAnalytics ? ("30d" as AnalyticsRangeKey) : rangeKey;

  const now = new Date();
  const { from, to, label, previousFrom, previousTo, days } = resolveDateRange(effectiveRange);
  const todayRange = resolveDateRange("today");

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
    todayPeriod,
    topCustomers,
    paymentMethodBreakdown,
    geoBreakdown,
    marketing,
    fulfillment,
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
        createdAt: { gte: from },
      },
      select: { items: true },
      take: 500,
    }),
    getPeriodMetrics(storeId, from, to),
    getPeriodMetrics(storeId, previousFrom, previousTo),
    prisma.order.groupBy({
      by: ["status"],
      where: { storeId },
      _count: { _all: true },
    }),
    getPeriodMetrics(storeId, todayRange.from, todayRange.to),
    getTopCustomers(storeId, from, to),
    getPaymentMethodBreakdown(storeId, from, to),
    getGeoBreakdown(storeId, from, to),
    getMarketingStats(storeId, from, to),
    getFulfillmentStats(storeId, from, to),
  ]);

  const bestSellersWithShare = buildBestSellers(topProducts);
  const lifetimeAov = orders > 0 ? (revenueAgg._sum.total ?? 0) / orders : 0;

  const funnel = advancedAnalytics
    ? await StorefrontEventService.getFunnelMetrics(storeId, from, to, currentPeriod.orders)
    : null;

  return {
    range: effectiveRange,
    capabilities: { advancedAnalytics },
    revenue: revenueAgg._sum.total ?? 0,
    orders,
    products,
    customers,
    recentOrders,
    bestSellers: bestSellersWithShare,
    today: {
      label: todayRange.label,
      ...todayPeriod,
    },
    period: {
      label,
      days,
      ...currentPeriod,
    },
    previousPeriod: {
      label: `Prior ${label.toLowerCase()}`,
      ...previousPeriod,
    },
    changes: {
      revenue: pctChange(currentPeriod.revenue, previousPeriod.revenue),
      orders: pctChange(currentPeriod.orders, previousPeriod.orders),
      newCustomers: pctChange(currentPeriod.newCustomers, previousPeriod.newCustomers),
      aov: pctChange(currentPeriod.aov, previousPeriod.aov),
      visitors: pctChange(currentPeriod.visitors, previousPeriod.visitors),
      conversionRate:
        currentPeriod.conversionRate !== null && previousPeriod.conversionRate !== null
          ? pctChange(currentPeriod.conversionRate, previousPeriod.conversionRate)
          : null,
    },
    aov: lifetimeAov,
    orderStatusBreakdown: statusGroups.map((group) => ({
      status: group.status,
      count: group._count._all,
    })),
    topCustomers,
    paymentMethodBreakdown,
    geoBreakdown,
    marketing,
    fulfillment,
    funnel,
  };
};

const getCharts = async (storeId: string, rangeKey: AnalyticsRangeKey = "30d") => {
  const effectiveRange = parseAnalyticsRange(rangeKey);
  const { days } = resolveDateRange(effectiveRange);
  const now = new Date();
  const since12m = new Date(now);
  since12m.setMonth(since12m.getMonth() - 12);

  const sinceDaily = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

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
    const total = Number(order.total) || 0;
    const month = monthKey(order.createdAt);
    monthlyRevenue[month] = (monthlyRevenue[month] ?? 0) + total;
    monthlyOrders[month] = (monthlyOrders[month] ?? 0) + 1;

    if (order.createdAt >= sinceDaily) {
      const day = dayKey(order.createdAt);
      dailyRevenue[day] = (dailyRevenue[day] ?? 0) + total;
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
    for (let i = days - 1; i >= 0; i--) {
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
