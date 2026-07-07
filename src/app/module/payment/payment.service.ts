import { randomBytes } from "node:crypto";
import { StatusCodes } from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { CouponType, OrderStatus, PaymentStatus, ProductStatus } from "../../lib/prisma-exports";
import { CommissionService } from "../commission/commission.service";
import { sslcommerzConfig } from "../../../config/sslcommerz.config";
import { SslCommerzService } from "./sslcommerz.service";

type CheckoutItemInput = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  image?: string;
};

type CheckoutInput = {
  items: CheckoutItemInput[];
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  couponCode?: string;
};

const generateOrderNumber = () => `ORD-${Date.now().toString(36).toUpperCase()}`;

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

const resolveUnitPrice = (product: { price: number; discountPrice: number | null }) =>
  product.discountPrice != null && product.discountPrice < product.price
    ? product.discountPrice
    : product.price;

export const calculateCheckout = async (
  storeId: string,
  input: CheckoutInput,
  shippingFee = 5,
) => {
  if (!input.items.length) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Cart is empty");
  }

  const lineItems: CheckoutItemInput[] = [];

  for (const item of input.items) {
    const product = await prisma.product.findFirst({
      where: { id: item.productId, storeId, status: ProductStatus.ACTIVE },
    });
    if (!product) {
      throw new AppError(StatusCodes.BAD_REQUEST, `Product ${item.name} is unavailable`);
    }
    if (product.stock < item.quantity) {
      throw new AppError(StatusCodes.BAD_REQUEST, `Insufficient stock for ${product.name}`);
    }

    const unitPrice = resolveUnitPrice(product);
    lineItems.push({
      productId: product.id,
      name: product.name,
      price: unitPrice,
      quantity: item.quantity,
      ...(item.size ? { size: item.size } : {}),
      ...(item.color ? { color: item.color } : {}),
      ...(item.image ? { image: item.image } : {}),
    });
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let discount = 0;
  let couponCode: string | undefined;

  if (input.couponCode) {
    const coupon = await prisma.coupon.findFirst({
      where: { storeId, code: input.couponCode.toUpperCase(), isActive: true },
    });
    if (!coupon) throw new AppError(StatusCodes.BAD_REQUEST, "Invalid coupon code");
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Coupon has expired");
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Coupon usage limit reached");
    }
    if (subtotal < coupon.minOrder) {
      throw new AppError(StatusCodes.BAD_REQUEST, `Minimum order for this coupon is ${coupon.minOrder}`);
    }

    discount =
      coupon.type === CouponType.PERCENT
        ? (subtotal * coupon.value) / 100
        : Math.min(coupon.value, subtotal);
    couponCode = coupon.code;
  }

  const shipping = shippingFee;
  const total = Math.max(subtotal + shipping - discount, 0.01);

  return { lineItems, subtotal, shipping, discount, total, couponCode };
};

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

const restoreOrderStock = async (orderId: string) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  const items = order.items as CheckoutItemInput[];
  await prisma.$transaction(
    items.map((item) =>
      prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      }),
    ),
  );
};

const createSslCommerzCheckout = async (storeId: string, storeSlug: string, input: CheckoutInput) => {
  if (!sslcommerzConfig.isConfigured) {
    throw new AppError(
      StatusCodes.SERVICE_UNAVAILABLE,
      "SSLCommerz is not configured. Add SSLC_STORE_ID and SSLC_STORE_PASSWORD.",
    );
  }

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new AppError(StatusCodes.NOT_FOUND, "Store not found");

  const calculated = await calculateCheckout(storeId, input);
  const transactionId = generateTransactionId();
  const currency = store.currency === "BDT" ? "BDT" : "BDT";

  const { order, payment } = await prisma.$transaction(async (tx) => {
    if (calculated.couponCode) {
      await tx.coupon.updateMany({
        where: { storeId, code: calculated.couponCode },
        data: { usedCount: { increment: 1 } },
      });
    }

    for (const item of calculated.lineItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    const createdOrder = await tx.order.create({
      data: {
        storeId,
        orderNumber: generateOrderNumber(),
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

  await upsertCustomer(storeId, {
    email: input.customerEmail,
    name: input.customerName,
    ...(input.customerPhone ? { phone: input.customerPhone } : {}),
    shippingAddress: input.shippingAddress,
    total: calculated.total,
  });

  const shipName = input.customerName.trim() || "Customer";
  const shipAddress = input.shippingAddress.line1.trim() || "N/A";
  const shipCity = input.shippingAddress.city.trim() || "Dhaka";
  const shipState = input.shippingAddress.state?.trim() || shipCity;
  const shipPostcode = input.shippingAddress.postalCode.trim() || "1000";
  const shipCountry = input.shippingAddress.country.trim() || "Bangladesh";

  const initResponse = await SslCommerzService.initPayment({
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

  console.info("[payment] SSLCommerz session initialized", {
    orderId: order.id,
    transactionId,
    amount: calculated.total,
  });

  return {
    paymentUrl: initResponse.GatewayPageURL,
    orderId: order.id,
    orderNumber: order.orderNumber,
    transactionId,
  };
};

const findPaymentByCallback = async (tranId?: string, orderId?: string) => {
  if (tranId) {
    const payment = await prisma.payment.findUnique({
      where: { transactionId: tranId },
      include: { order: { include: { store: { select: { slug: true } } } } },
    });
    if (payment) return payment;
  }

  if (orderId) {
    const payment = await prisma.payment.findUnique({
      where: { orderId },
      include: { order: { include: { store: { select: { slug: true } } } } },
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
      data: { status: OrderStatus.CONFIRMED, paymentMethod: "SSLCOMMERZ" },
    });

    return { payment, wasAlreadyPaid: false };
  });

  if (!result.wasAlreadyPaid) {
    await CommissionService.onOrderStatusChanged(
      result.payment.orderId,
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
    );
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

  const validation = await SslCommerzService.validatePayment(valId);
  const isValid = validation.status === "VALID" || validation.status === "VALIDATED";

  console.info("[payment] SSLCommerz validation response", {
    tranId,
    valId,
    status: validation.status,
  });

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

  const validation = await SslCommerzService.validatePayment(valId);
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
  processSuccessCallback,
  processFailCallback,
  processCancelCallback,
  processIpnCallback,
  getPaymentByOrderNumber,
};
