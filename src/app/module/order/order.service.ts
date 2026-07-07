import { StatusCodes } from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { OrderStatus, PaymentStatus, ProductStatus } from "../../lib/prisma-exports";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { CommissionService } from "../commission/commission.service";
import {
  calculateCheckout,
  CheckoutInput,
  decrementOrderStock,
  generateInvoiceNumber,
  generateOrderNumber,
  parseStorePayments,
  restoreOrderStock,
  upsertCheckoutCustomer,
} from "./checkout.service";
import { OrderEmailService } from "./order-email.service";
import {
  appendStatusHistory,
  assertValidStatusTransition,
  shouldRestoreStockOnStatus,
} from "./order-status";

const getStoreOwnerEmail = async (storeId: string) => {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { owner: { select: { email: true } } },
  });
  return store?.owner.email ?? null;
};

const loadOrderEmailContext = async (orderId: string) =>
  prisma.order.findUnique({
    where: { id: orderId },
    include: { store: { select: { brandName: true, slug: true, currency: true } } },
  });

const previewCheckout = async (storeId: string, input: CheckoutInput) => {
  const calculated = await calculateCheckout(storeId, input);
  return calculated;
};

const createPublicOrder = async (storeId: string, payload: CheckoutInput & { paymentMethod?: string }) => {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { country: true, payments: true },
  });
  if (!store) throw new AppError(StatusCodes.NOT_FOUND, "Store not found");

  const paymentSettings = parseStorePayments(store.payments);
  const method = payload.paymentMethod ?? "COD";

  if (method === "COD" && paymentSettings.codEnabled === false) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Cash on delivery is not available for this store");
  }
  if (method === "SSLCOMMERZ" && paymentSettings.sslEnabled === false) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Online payment is not available for this store");
  }

  const calculated = await calculateCheckout(storeId, payload);
  const invoiceNumber = generateInvoiceNumber(generateOrderNumber());

  const order = await prisma.$transaction(async (tx) => {
    if (calculated.couponCode) {
      await tx.coupon.updateMany({
        where: { storeId, code: calculated.couponCode },
        data: { usedCount: { increment: 1 } },
      });
    }

    await decrementOrderStock(tx, calculated.lineItems);

    const customer = await upsertCheckoutCustomer(storeId, {
      email: payload.customerEmail,
      name: payload.customerName,
      ...(payload.customerPhone ? { phone: payload.customerPhone } : {}),
      shippingAddress: payload.shippingAddress,
      total: calculated.total,
    });

    return tx.order.create({
      data: {
        storeId,
        customerId: customer.id,
        orderNumber: generateOrderNumber(),
        invoiceNumber,
        status: OrderStatus.PENDING,
        paymentMethod: method,
        items: calculated.lineItems as object,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail.toLowerCase(),
        customerPhone: payload.customerPhone ?? null,
        shippingAddress: payload.shippingAddress as object,
        subtotal: calculated.subtotal,
        shipping: calculated.shipping,
        discount: calculated.discount,
        total: calculated.total,
        couponCode: calculated.couponCode ?? null,
        statusHistory: appendStatusHistory([], OrderStatus.PENDING, "Order placed") as object,
      },
      include: { store: { select: { brandName: true, slug: true, currency: true } } },
    });
  });

  const ownerEmail = await getStoreOwnerEmail(storeId);
  void OrderEmailService.sendOrderPlacedEmail(order);
  if (ownerEmail) void OrderEmailService.sendOwnerNewOrderEmail(order, ownerEmail);

  if (method === "COD") {
    const confirmed = await updateOrderStatus(storeId, order.id, OrderStatus.CONFIRMED, undefined, {
      skipTransitionCheck: true,
      skipEmail: true,
    });
    return confirmed ?? order;
  }

  return order;
};

const getOrders = async (storeId: string, query: Record<string, unknown>) => {
  const result = await new QueryBuilder(prisma.order as any, query, {
    searchableFields: ["orderNumber", "customerName", "customerEmail", "invoiceNumber"],
    filterableFields: ["status", "paymentMethod"],
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
    include: {
      payment: true,
      platformEarning: true,
      customer: { select: { id: true, email: true, name: true, phone: true, orderCount: true } },
    },
  });
  if (!order) throw new AppError(StatusCodes.NOT_FOUND, "Order not found");
  return order;
};

const updateOrderStatus = async (
  storeId: string,
  id: string,
  status: OrderStatus,
  tracking?: { trackingNumber?: string | null; trackingCarrier?: string | null },
  options?: { skipTransitionCheck?: boolean; skipEmail?: boolean },
) => {
  const existing = await getOrder(storeId, id);

  if (!options?.skipTransitionCheck) {
    assertValidStatusTransition(existing.status, status);
  }

  if (shouldRestoreStockOnStatus(existing.status, status)) {
    await restoreOrderStock(id);
  }

  const order = await prisma.order.update({
    where: { id },
    data: {
      status,
      ...(tracking?.trackingNumber !== undefined ? { trackingNumber: tracking.trackingNumber } : {}),
      ...(tracking?.trackingCarrier !== undefined ? { trackingCarrier: tracking.trackingCarrier } : {}),
      statusHistory: appendStatusHistory(existing.statusHistory, status) as object,
    },
    include: {
      payment: true,
      platformEarning: true,
      customer: { select: { id: true, email: true, name: true, phone: true, orderCount: true } },
    },
  });

  await CommissionService.onOrderStatusChanged(id, existing.status, status);

  if (!options?.skipEmail && existing.status !== status) {
    const emailOrder = await loadOrderEmailContext(id);
    if (emailOrder) {
      void OrderEmailService.sendOrderStatusEmail(emailOrder, existing.status, status);
    }
  }

  return order;
};

const refundOrder = async (storeId: string, id: string, reason?: string) => {
  const order = await getOrder(storeId, id);
  const payment = order.payment;

  if (!payment || payment.status !== PaymentStatus.PAID) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Only paid orders can be refunded");
  }

  if (payment.status === PaymentStatus.REFUNDED) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Order is already refunded");
  }

  const refundableStatuses: OrderStatus[] = [
    OrderStatus.CONFIRMED,
    OrderStatus.PACKED,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
  ];
  if (!refundableStatuses.includes(order.status)) {
    throw new AppError(StatusCodes.BAD_REQUEST, "This order cannot be refunded in its current state");
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.REFUNDED },
    }),
    prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
        statusHistory: appendStatusHistory(
          order.statusHistory,
          OrderStatus.CANCELLED,
          reason ? `Refunded: ${reason}` : "Refunded",
        ) as object,
      },
    }),
  ]);

  await restoreOrderStock(id);
  await CommissionService.onOrderStatusChanged(id, order.status, OrderStatus.CANCELLED);

  const refreshed = await getOrder(storeId, id);
  const emailOrder = await loadOrderEmailContext(id);
  if (emailOrder) {
    void OrderEmailService.sendOrderStatusEmail(emailOrder, order.status, OrderStatus.CANCELLED);
  }

  return refreshed;
};

const retryPayment = async (storeId: string, storeSlug: string, orderId: string) => {
  const order = await getOrder(storeId, orderId);
  if (order.paymentMethod !== "SSLCOMMERZ") {
    throw new AppError(StatusCodes.BAD_REQUEST, "Only SSLCommerz orders support payment retry");
  }
  if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CANCELLED) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Order is not eligible for payment retry");
  }

  const { PaymentService } = await import("../payment/payment.service");
  return PaymentService.createSslCommerzCheckoutForOrder(storeId, storeSlug, order);
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
    include: { payment: true },
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
    include: { payment: true },
  });
  if (!order) throw new AppError(StatusCodes.NOT_FOUND, "Order not found");
  return order;
};

const trackGuestOrder = async (storeId: string, orderNumber: string, email: string) => {
  return getCustomerOrderByNumber(storeId, orderNumber, email);
};

const getPublicPaymentOptions = async (storeId: string) => {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { payments: true, shipping: true, country: true },
  });
  if (!store) throw new AppError(StatusCodes.NOT_FOUND, "Store not found");

  const paymentSettings = parseStorePayments(store.payments);
  const { sslcommerzConfig } = await import("../../../config/sslcommerz.config");

  return {
    codEnabled: paymentSettings.codEnabled !== false,
    sslEnabled:
      paymentSettings.sslEnabled !== false && sslcommerzConfig.isConfigured,
    shipping: store.shipping,
    storeCountry: store.country,
  };
};

export const OrderService = {
  previewCheckout,
  createPublicOrder,
  getOrders,
  getOrder,
  getOrderStats,
  updateOrderStatus,
  refundOrder,
  retryPayment,
  getCustomerOrders,
  getCustomerOrderByNumber,
  trackGuestOrder,
  getPublicPaymentOptions,
};
