import { prisma } from "../../lib/prisma";
import { OrderStatus, ProductStatus } from "../../lib/prisma-exports";

const getOverview = async (storeId: string) => {
  const [orders, products, customers, revenueAgg, recentOrders, topProducts] = await Promise.all([
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
      take: 5,
    }),
    prisma.order.findMany({
      where: { storeId, status: { not: OrderStatus.CANCELLED } },
      select: { items: true },
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
    .slice(0, 5);

  return {
    revenue: revenueAgg._sum.total ?? 0,
    orders,
    products,
    customers,
    recentOrders,
    bestSellers,
  };
};

const getCharts = async (storeId: string) => {
  const orders = await prisma.order.findMany({
    where: { storeId, status: { not: OrderStatus.CANCELLED } },
    select: { total: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const monthlyRevenue: Record<string, number> = {};
  for (const order of orders) {
    const key = order.createdAt.toISOString().slice(0, 7);
    monthlyRevenue[key] = (monthlyRevenue[key] ?? 0) + order.total;
  }

  return {
    monthlyRevenue: Object.entries(monthlyRevenue).map(([month, revenue]) => ({ month, revenue })),
    totalOrders: orders.length,
  };
};

export const AnalyticsService = { getOverview, getCharts };
