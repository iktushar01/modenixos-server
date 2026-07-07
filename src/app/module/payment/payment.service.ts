import { randomBytes } from "node:crypto";
import { StatusCodes } from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { OrderStatus, PaymentStatus } from "../../lib/prisma-exports";
import { CommissionService } from "../commission/commission.service";
import { sslcommerzConfig } from "../../../config/sslcommerz.config";
import { SslCommerzService } from "./sslcommerz.service";
import {
  calculateCheckout,
  CheckoutInput,
  decrementOrderStock,
  generateInvoiceNumber,
  generateOrderNumber,
  parseStorePayments,
  restoreOrderStock,
  upsertCheckoutCustomer,
} from "../order/checkout.service";
import { appendStatusHistory } from "../order/order-status";
import { OrderEmailService } from "../order/order-email.service";

const generateTransactionId = () =>
  `MODX-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;

const storeFrontendBase = (storeSlug: string) =>
  `${sslcommerzConfig.frontendUrl}/store/${encodeURIComponent(storeSlug)}`;

const buildOrderConfirmationUrl = (
  storeSlug: string,
  orderNumber: string,
  customerEmail: string,
  transactionId?: string,
) => {
  const params = new URLSearchParams({
    order: orderNumber,
    email: customerEmail,
  });
  if (transactionId) params.set("tran_id", transactionId);
  return `${storeFrontendBase(storeSlug)}/orders/confirmation?${params.toString()}`;
};

const buildStorePaymentStatusUrl = (
  storeSlug: string,
  status: "failed" | "cancelled",
  orderNumber?: string,
  transactionId?: string,
) => {
  const params = new URLSearchParams();
  if (orderNumber) params.set("order", orderNumber);
  if (transactionId) params.set("tran_id", transactionId);
  const qs = params.toString();
  return qs
    ? `${storeFrontendBase(storeSlug)}/payment/${status}?${qs}`
    : `${storeFrontendBase(storeSlug)}/payment/${status}`;
};

const resolveSslCredentials = (storePayments: unknown) => {
  const settings = parseStorePayments(storePayments);
  if (settings.sslStoreId && settings.sslStorePassword) {
    return { storeId: settings.sslStoreId, storePassword: settings.sslStorePassword };
  }
  if (!sslcommerzConfig.isConfigured) return null;
  return {
    storeId: sslcommerzConfig.storeId,
    storePassword: sslcommerzConfig.storePassword,
  };
};

const initSslSession = async (
  credentials: { storeId: string; storePassword: string },
  payload: Parameters<typeof SslCommerzService.initPayment>[0],
) => SslCommerzService.initPayment(payload, credentials);

const createOrderWithPayment = async (
  storeId: string,
  input: CheckoutInput,
  existingOrder?: { id: string; orderNumber: string; invoiceNumber: string | null },
) => {
  const calculated = await calculateCheckout(storeId, input);
  const orderNumber = existingOrder?.orderNumber ?? generateOrderNumber();
  const invoiceNumber = existingOrder?.invoiceNumber ?? generateInvoiceNumber(orderNumber);
  const transactionId = generateTransactionId();

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { currency: true, payments: true },
  });
  if (!store) throw new AppError(StatusCodes.NOT_FOUND, "Store not found");

  const currency = store.currency === "BDT" ? "BDT" : "BDT";

  const { order, payment } = await prisma.$transaction(async (tx) => {
    if (calculated.couponCode && !existingOrder) {
      await tx.coupon.updateMany({
        where: { storeId, code: calculated.couponCode },
        data: { usedCount: { increment: 1 } },
      });
    }

    if (!existingOrder) {
      await decrementOrderStock(tx, calculated.lineItems);
    }

    const createdOrder = existingOrder
      ? await tx.order.update({
          where: { id: existingOrder.id },
          data: {
            status: OrderStatus.PENDING,
            paymentMethod: "SSLCOMMERZ",
            items: calculated.lineItems as object,
            customerName: input.customerName,
            customerEmail: input.customerEmail.toLowerCase(),
            customerPhone: input.customerPhone ?? null,
            shippingAddress: input.shippingAddress as object,
            subtotal: calculated.subtotal,
            shipping: calculated.shipping,
            discount: calculated.discount,
            total: calculated.total,
            couponCode: calculated.couponCode ?? null,
            statusHistory: appendStatusHistory([], OrderStatus.PENDING, "Payment retry") as object,
          },
        })
      : await tx.order.create({
          data: {
            storeId,
            orderNumber,
            invoiceNumber,
            status: OrderStatus.PENDING,
            paymentMethod: "SSLCOMMERZ",
            items: calculated.lineItems as object,
            customerName: input.customerName,
            customerEmail: input.customerEmail.toLowerCase(),
            customerPhone: input.customerPhone ?? null,
            shippingAddress: input.shippingAddress as object,
            subtotal: calculated.subtotal,
            shipping: calculated.shipping,
            discount: calculated.discount,
            total: calculated.total,
            couponCode: calculated.couponCode ?? null,
            statusHistory: appendStatusHistory([], OrderStatus.PENDING, "Order placed") as object,
          },
        });

    const createdPayment = await tx.payment.create({
      data: {
        orderId: createdOrder.id,
        amount: calculated.total,
        currency,
        provider: "SSLCOMMERZ",
        transactionId,
        status: PaymentStatus.PENDING,
      },
    });

    return { order: createdOrder, payment: createdPayment };
  });

  if (!existingOrder) {
    const customer = await upsertCheckoutCustomer(storeId, {
      email: input.customerEmail,
      name: input.customerName,
      ...(input.customerPhone ? { phone: input.customerPhone } : {}),
      shippingAddress: input.shippingAddress,
      total: calculated.total,
    });
    await prisma.order.update({ where: { id: order.id }, data: { customerId: customer.id } });

    const orderWithStore = await prisma.order.findUnique({
      where: { id: order.id },
      include: { store: { select: { brandName: true, slug: true, currency: true } } },
    });
    if (orderWithStore) {
      void OrderEmailService.sendOrderPlacedEmail(orderWithStore);
      const owner = await prisma.store.findUnique({
        where: { id: storeId },
        select: { owner: { select: { email: true } } },
      });
      if (owner?.owner.email) {
        void OrderEmailService.sendOwnerNewOrderEmail(orderWithStore, owner.owner.email);
      }
    }
  }

  return { order, payment, calculated, currency, transactionId };
};

const createSslCommerzCheckout = async (storeId: string, storeSlug: string, input: CheckoutInput) => {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new AppError(StatusCodes.NOT_FOUND, "Store not found");

  const paymentSettings = parseStorePayments(store.payments);
  if (paymentSettings.sslEnabled === false) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Online payment is not available for this store");
  }

  const credentials = resolveSslCredentials(store.payments);
  if (!credentials) {
    throw new AppError(
      StatusCodes.SERVICE_UNAVAILABLE,
      "SSLCommerz is not configured. Add SSLC_STORE_ID and SSLC_STORE_PASSWORD.",
    );
  }

  const { order, payment, calculated, currency, transactionId } = await createOrderWithPayment(
    storeId,
    input,
  );

  const shipName = input.customerName.trim() || "Customer";
  const shipAddress = input.shippingAddress.line1.trim() || "N/A";
  const shipCity = input.shippingAddress.city.trim() || "Dhaka";
  const shipState = input.shippingAddress.state?.trim() || shipCity;
  const shipPostcode = input.shippingAddress.postalCode.trim() || "1000";
  const shipCountry = input.shippingAddress.country.trim() || "Bangladesh";

  const initResponse = await initSslSession(credentials, {
    total_amount: calculated.total,
    currency,
    tran_id: transactionId,
    success_url: sslcommerzConfig.successUrl,
    fail_url: sslcommerzConfig.failUrl,
    cancel_url: sslcommerzConfig.cancelUrl,
    ipn_url: sslcommerzConfig.ipnUrl,
    cus_name: shipName,
    cus_email: input.customerEmail,
    cus_phone: input.customerPhone ?? "01700000000",
    cus_add1: shipAddress,
    cus_city: shipCity,
    cus_postcode: shipPostcode,
    cus_country: shipCountry,
    shipping_method: "YES",
    ship_name: shipName,
    ship_add1: shipAddress,
    ship_add2: input.shippingAddress.line2?.trim() || shipAddress,
    ship_city: shipCity,
    ship_state: shipState,
    ship_postcode: shipPostcode,
    ship_country: shipCountry,
    num_of_item: calculated.lineItems.length,
    product_name: `Order ${order.orderNumber}`,
    product_category: "E-commerce",
    product_profile: "physical-goods",
    value_a: storeSlug,
    value_b: order.id,
  });

  if (initResponse.status !== "SUCCESS" || !initResponse.GatewayPageURL) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        gatewayResponse: initResponse as object,
      },
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.CANCELLED },
    });
    await restoreOrderStock(order.id);
    throw new AppError(
      StatusCodes.BAD_GATEWAY,
      initResponse.failedreason ?? "Failed to initialize SSLCommerz payment session",
    );
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { gatewayResponse: initResponse as object },
  });

  return {
    paymentUrl: initResponse.GatewayPageURL,
    orderId: order.id,
    orderNumber: order.orderNumber,
    transactionId,
  };
};

const createSslCommerzCheckoutForOrder = async (
  storeId: string,
  storeSlug: string,
  order: {
    id: string;
    orderNumber: string;
    invoiceNumber: string | null;
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    shippingAddress: unknown;
    items: unknown;
    couponCode: string | null;
  },
) => {
  const items = order.items as CheckoutInput["items"];
  const shippingAddress = order.shippingAddress as CheckoutInput["shippingAddress"];

  return createSslCommerzCheckout(storeId, storeSlug, {
    items,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone ?? undefined,
    shippingAddress,
    ...(order.couponCode ? { couponCode: order.couponCode } : {}),
  });
};

const findPaymentByCallback = async (tranId?: string, orderId?: string) => {
  if (tranId) {
    const payment = await prisma.payment.findUnique({
      where: { transactionId: tranId },
      include: { order: { include: { store: { select: { slug: true, payments: true } } } } },
    });
    if (payment) return payment;
  }

  if (orderId) {
    const payment = await prisma.payment.findUnique({
      where: { orderId },
      include: { order: { include: { store: { select: { slug: true, payments: true } } } } },
    });
    if (payment) return payment;
  }

  return null;
};

const markPaymentPaid = async (
  paymentId: string,
  validationId: string,
  gatewayResponse: Record<string, unknown>,
) => {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new AppError(StatusCodes.NOT_FOUND, "Payment not found");
    if (payment.status === PaymentStatus.PAID) {
      return { payment, wasAlreadyPaid: true };
    }

    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.PAID,
        validationId,
        paidAt: new Date(),
        gatewayResponse: gatewayResponse as object,
      },
    });

    await tx.order.update({
      where: { id: payment.orderId },
      data: {
        status: OrderStatus.CONFIRMED,
        paymentMethod: "SSLCOMMERZ",
        statusHistory: appendStatusHistory([], OrderStatus.CONFIRMED, "Payment received") as object,
      },
    });

    return { payment, wasAlreadyPaid: false };
  });

  if (!result.wasAlreadyPaid) {
    await CommissionService.onOrderStatusChanged(
      result.payment.orderId,
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
    );

    const emailOrder = await prisma.order.findUnique({
      where: { id: result.payment.orderId },
      include: { store: { select: { brandName: true, slug: true, currency: true } } },
    });
    const paidPayment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (emailOrder && paidPayment) {
      void OrderEmailService.sendPaymentReceiptEmail(emailOrder, paidPayment);
    }
  }

  return prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: { include: { store: { select: { slug: true } } } } },
  });
};

const markPaymentFailed = async (paymentId: string, gatewayResponse: Record<string, unknown>) => {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status === PaymentStatus.PAID) return payment;

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.FAILED, gatewayResponse: gatewayResponse as object },
    }),
    prisma.order.update({
      where: { id: payment.orderId },
      data: { status: OrderStatus.CANCELLED },
    }),
  ]);

  await restoreOrderStock(payment.orderId);
  return prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: { include: { store: { select: { slug: true } } } } },
  });
};

const markPaymentCancelled = async (paymentId: string, gatewayResponse: Record<string, unknown>) => {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status === PaymentStatus.PAID) return payment;

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.CANCELLED, gatewayResponse: gatewayResponse as object },
    }),
    prisma.order.update({
      where: { id: payment.orderId },
      data: { status: OrderStatus.CANCELLED },
    }),
  ]);

  await restoreOrderStock(payment.orderId);
  return prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: { include: { store: { select: { slug: true } } } } },
  });
};

const processSuccessCallback = async (payload: Record<string, string>) => {
  const tranId = payload.tran_id;
  const valId = payload.val_id;
  const orderId = payload.value_b;
  const storeSlug = payload.value_a;

  const payment = await findPaymentByCallback(tranId, orderId);
  if (!payment) {
    throw new AppError(StatusCodes.NOT_FOUND, "Payment not found");
  }

  if (!valId) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Missing validation id");
  }

  const credentials = resolveSslCredentials(payment.order.store.payments);
  const validation = await SslCommerzService.validatePayment(
    valId,
    credentials ?? undefined,
  );
  const isValid = validation.status === "VALID" || validation.status === "VALIDATED";

  if (!isValid || validation.tran_id !== payment.transactionId) {
    await markPaymentFailed(payment.id, { ...payload, validation });
    const slug = storeSlug ?? payment.order.store.slug;
    return {
      redirectUrl: buildStorePaymentStatusUrl(slug, "failed", payment.order.orderNumber, payment.transactionId),
    };
  }

  const validatedAmount = Number(validation.amount ?? validation.store_amount ?? 0);
  if (Math.abs(validatedAmount - payment.amount) > 0.01) {
    await markPaymentFailed(payment.id, { ...payload, validation, reason: "amount_mismatch" });
    const slug = storeSlug ?? payment.order.store.slug;
    return {
      redirectUrl: buildStorePaymentStatusUrl(slug, "failed", payment.order.orderNumber, payment.transactionId),
    };
  }

  await markPaymentPaid(payment.id, valId, { ...payload, validation });

  const slug = storeSlug ?? payment.order.store.slug;
  return {
    redirectUrl: buildOrderConfirmationUrl(
      slug,
      payment.order.orderNumber,
      payment.order.customerEmail,
      payment.transactionId,
    ),
  };
};

const processFailCallback = async (payload: Record<string, string>) => {
  const payment = await findPaymentByCallback(payload.tran_id, payload.value_b);
  if (!payment) {
    const storeSlug = payload.value_a;
    return {
      redirectUrl: storeSlug
        ? buildStorePaymentStatusUrl(storeSlug, "failed")
        : `${sslcommerzConfig.frontendUrl}/payment/failed`,
    };
  }

  await markPaymentFailed(payment.id, payload);
  return {
    redirectUrl: buildStorePaymentStatusUrl(
      payment.order.store.slug,
      "failed",
      payment.order.orderNumber,
      payment.transactionId,
    ),
  };
};

const processCancelCallback = async (payload: Record<string, string>) => {
  const payment = await findPaymentByCallback(payload.tran_id, payload.value_b);
  if (!payment) {
    const storeSlug = payload.value_a;
    return {
      redirectUrl: storeSlug
        ? buildStorePaymentStatusUrl(storeSlug, "cancelled")
        : `${sslcommerzConfig.frontendUrl}/payment/cancelled`,
    };
  }

  await markPaymentCancelled(payment.id, payload);
  return {
    redirectUrl: buildStorePaymentStatusUrl(
      payment.order.store.slug,
      "cancelled",
      payment.order.orderNumber,
      payment.transactionId,
    ),
  };
};

const processIpnCallback = async (payload: Record<string, string>) => {
  const valId = payload.val_id;
  const tranId = payload.tran_id;

  if (!valId || !tranId) {
    return { ok: false, message: "Missing val_id or tran_id" };
  }

  const payment = await findPaymentByCallback(tranId, payload.value_b);
  if (!payment) return { ok: false, message: "Payment not found" };

  if (payment.status === PaymentStatus.PAID) {
    return { ok: true, message: "Already processed" };
  }

  const credentials = resolveSslCredentials(payment.order.store.payments);
  const validation = await SslCommerzService.validatePayment(
    valId,
    credentials ?? undefined,
  );
  const isValid = validation.status === "VALID" || validation.status === "VALIDATED";

  if (isValid && validation.tran_id === payment.transactionId) {
    await markPaymentPaid(payment.id, valId, { ...payload, validation, source: "ipn" });
    return { ok: true, message: "Payment confirmed via IPN" };
  }

  return { ok: false, message: "Validation failed" };
};

const getPaymentByOrderNumber = async (storeId: string, orderNumber: string) => {
  const order = await prisma.order.findFirst({
    where: { storeId, orderNumber },
    include: { payment: true },
  });
  if (!order) throw new AppError(StatusCodes.NOT_FOUND, "Order not found");
  return order;
};

export const PaymentService = {
  calculateCheckout,
  createSslCommerzCheckout,
  createSslCommerzCheckoutForOrder,
  processSuccessCallback,
  processFailCallback,
  processCancelCallback,
  processIpnCallback,
  getPaymentByOrderNumber,
};
