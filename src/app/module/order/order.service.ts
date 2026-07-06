import { StatusCodes } from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { OrderStatus, ProductStatus } from "../../lib/prisma-exports";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { CommissionService } from "../commission/commission.service";

const generateOrderNumber = () => `ORD-${Date.now().toString(36).toUpperCase()}`;

const upsertCustomer = async (
  storeId: string,
  data: { email: string; name: string; phone?: string; shippingAddress: Record<string, unknown>; total: number },
) => {
  const existing = await prisma.customer.findUnique({
    where: { storeId_email: { storeId, email: data.email } },
  });

  if (existing) {
    const addresses = Array.isArray(existing.addresses) ? (existing.addresses as unknown[]) : [];
    return prisma.customer.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        ...(data.phone ? { phone: data.phone } : {}),
        orderCount: { increment: 1 },
        totalSpent: { increment: data.total },
        addresses: [...addresses, data.shippingAddress] as object,
      },
    });
  }

  return prisma.customer.create({
    data: {
      storeId,
      email: data.email,
      name: data.name,
      phone: data.phone ?? null,
      orderCount: 1,
      totalSpent: data.total,
      addresses: [data.shippingAddress] as object,
    },
  });
};

const createPublicOrder = async (
  storeId: string,
  payload: {
    items: Array<{ productId: string; name: string; price: number; quantity: number; size?: string; color?: string }>;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    shippingAddress: Record<string, unknown>;
    subtotal: number;
    shipping?: number;
    discount?: number;
    total: number;
    couponCode?: string;
    paymentMethod?: string;
  },
) => {
  for (const item of payload.items) {
    const product = await prisma.product.findFirst({
      where: { id: item.productId, storeId, status: ProductStatus.ACTIVE },
    });
    if (!product) throw new AppError(StatusCodes.BAD_REQUEST, `Product ${item.name} is unavailable`);
    if (product.stock < item.quantity) {
      throw new AppError(StatusCodes.BAD_REQUEST, `Insufficient stock for ${item.name}`);
    }
  }

  if (payload.couponCode) {
    const coupon = await prisma.coupon.findFirst({
      where: { storeId, code: payload.couponCode.toUpperCase(), isActive: true },
    });
    if (!coupon) throw new AppError(StatusCodes.BAD_REQUEST, "Invalid coupon code");
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Coupon has expired");
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Coupon usage limit reached");
    }
    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { usedCount: { increment: 1 } },
    });
  }

  const order = await prisma.$transaction(async (tx) => {
    for (const item of payload.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    return tx.order.create({
      data: {
        storeId,
        orderNumber: generateOrderNumber(),
        status: OrderStatus.PENDING,
        paymentMethod: payload.paymentMethod ?? "COD",
        items: payload.items as object,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail.toLowerCase(),
        customerPhone: payload.customerPhone ?? null,
        shippingAddress: payload.shippingAddress as object,
        subtotal: payload.subtotal,
        shipping: payload.shipping ?? 0,
        discount: payload.discount ?? 0,
        total: payload.total,
        couponCode: payload.couponCode?.toUpperCase() ?? null,
      },
    });
  });

  await upsertCustomer(storeId, {
    email: payload.customerEmail,
    name: payload.customerName,
    ...(payload.customerPhone ? { phone: payload.customerPhone } : {}),
    shippingAddress: payload.shippingAddress,
    total: payload.total,
  });

  return order;
};

const getOrders = async (storeId: string, query: Record<string, unknown>) => {
  const result = await new QueryBuilder(prisma.order as any, query, {
    searchableFields: ["orderNumber", "customerName", "customerEmail"],
    filterableFields: ["status"],
  })
    .where({ storeId })
    .search()
    .filter()
    .sort()
    .paginate()
    .execute();

  const orderIds = (result.data as Array<{ id: string }>).map((o) => o.id);
  const [payments, earnings] = orderIds.length
    ? await Promise.all([
        prisma.payment.findMany({ where: { orderId: { in: orderIds } } }),
        prisma.platformEarning.findMany({ where: { orderId: { in: orderIds } } }),
      ])
    : [[], []];
  const paymentByOrder = new Map(payments.map((p) => [p.orderId, p]));
  const earningByOrder = new Map(earnings.map((e) => [e.orderId, e]));

  return {
    ...result,
    data: (result.data as Array<Record<string, unknown>>).map((order) => ({
      ...order,
      payment: paymentByOrder.get(order.id as string) ?? null,
      platformEarning: earningByOrder.get(order.id as string) ?? null,
    })),
  };
};

const getOrder = async (storeId: string, id: string) => {
  const order = await prisma.order.findFirst({
    where: { id, storeId },
    include: { payment: true, platformEarning: true },
  });
  if (!order) throw new AppError(StatusCodes.NOT_FOUND, "Order not found");
  return order;
};

const updateOrderStatus = async (
  storeId: string,
  id: string,
  status: OrderStatus,
  tracking?: { trackingNumber?: string | null; trackingCarrier?: string | null },
) => {
  const existing = await getOrder(storeId, id);
  const order = await prisma.order.update({
    where: { id },
    data: {
      status,
      ...(tracking?.trackingNumber !== undefined ? { trackingNumber: tracking.trackingNumber } : {}),
      ...(tracking?.trackingCarrier !== undefined ? { trackingCarrier: tracking.trackingCarrier } : {}),
    },
    include: { payment: true, platformEarning: true },
  });

  await CommissionService.onOrderStatusChanged(id, existing.status, status);

  const refreshed = await prisma.order.findFirst({
    where: { id, storeId },
    include: { payment: true, platformEarning: true },
  });

  return refreshed ?? order;
};

const getOrderStats = async (storeId: string) => {
  const fulfilledStatuses = [
    OrderStatus.CONFIRMED,
    OrderStatus.PACKED,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
  ];

  const [totalConfirmed, amountAgg, customerRows] = await Promise.all([
    prisma.order.count({
      where: { storeId, status: { in: fulfilledStatuses } },
    }),
    prisma.order.aggregate({
      where: { storeId, status: { in: fulfilledStatuses } },
      _sum: { total: true },
    }),
    prisma.order.findMany({
      where: { storeId, status: { not: OrderStatus.CANCELLED } },
      select: { customerEmail: true },
      distinct: ["customerEmail"],
    }),
  ]);

  return {
    totalConfirmed,
    totalAmount: amountAgg._sum.total ?? 0,
    customersServed: customerRows.length,
  };
};

const getCustomerOrders = async (storeId: string, customerEmail: string) => {
  return prisma.order.findMany({
    where: { storeId, customerEmail: customerEmail.toLowerCase() },
    orderBy: { createdAt: "desc" },
  });
};

const getCustomerOrderByNumber = async (
  storeId: string,
  orderNumber: string,
  customerEmail: string,
) => {
  const order = await prisma.order.findFirst({
    where: {
      storeId,
      orderNumber,
      customerEmail: customerEmail.toLowerCase(),
    },
  });
  if (!order) throw new AppError(StatusCodes.NOT_FOUND, "Order not found");
  return order;
};

const trackGuestOrder = async (storeId: string, orderNumber: string, email: string) => {
  return getCustomerOrderByNumber(storeId, orderNumber, email);
};

export const OrderService = {
  createPublicOrder,
  getOrders,
  getOrder,
  getOrderStats,
  updateOrderStatus,
  getCustomerOrders,
  getCustomerOrderByNumber,
  trackGuestOrder,
};
