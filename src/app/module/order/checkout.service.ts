import { StatusCodes } from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { CouponType, ProductStatus } from "../../lib/prisma-exports";

export type CheckoutItemInput = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  image?: string;
};

export type CheckoutInput = {
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

export type StoreShippingSettings = {
  insideRate?: number;
  outsideRate?: number;
  freeShippingMin?: number;
};

export type StorePaymentSettings = {
  codEnabled?: boolean;
  sslEnabled?: boolean;
  sslStoreId?: string;
  sslStorePassword?: string;
};

const DEFAULT_SHIPPING_FEE = 5;

export const generateOrderNumber = () => `ORD-${Date.now().toString(36).toUpperCase()}`;

export const generateInvoiceNumber = (orderNumber: string) =>
  `INV-${orderNumber.replace(/^ORD-/, "")}`;

export const resolveUnitPrice = (product: { price: number; discountPrice: number | null }) =>
  product.discountPrice != null && product.discountPrice < product.price
    ? product.discountPrice
    : product.price;

export const parseStoreShipping = (shipping: unknown): StoreShippingSettings => {
  if (!shipping || typeof shipping !== "object") return {};
  const s = shipping as Record<string, unknown>;
  return {
    ...(typeof s.insideRate === "number" ? { insideRate: s.insideRate } : {}),
    ...(typeof s.outsideRate === "number" ? { outsideRate: s.outsideRate } : {}),
    ...(typeof s.freeShippingMin === "number" ? { freeShippingMin: s.freeShippingMin } : {}),
  };
};

export const parseStorePayments = (payments: unknown): StorePaymentSettings => {
  if (!payments || typeof payments !== "object") return {};
  const p = payments as Record<string, unknown>;
  return {
    ...(typeof p.codEnabled === "boolean" ? { codEnabled: p.codEnabled } : {}),
    ...(typeof p.sslEnabled === "boolean" ? { sslEnabled: p.sslEnabled } : {}),
    ...(typeof p.sslStoreId === "string" ? { sslStoreId: p.sslStoreId } : {}),
    ...(typeof p.sslStorePassword === "string" ? { sslStorePassword: p.sslStorePassword } : {}),
  };
};

export const resolveShippingFee = (
  storeCountry: string,
  shippingAddress: CheckoutInput["shippingAddress"],
  shippingSettings: StoreShippingSettings,
  subtotal: number,
) => {
  const { freeShippingMin, insideRate, outsideRate } = shippingSettings;
  if (freeShippingMin != null && subtotal >= freeShippingMin) return 0;

  const isDomestic =
    shippingAddress.country.trim().toLowerCase() === storeCountry.trim().toLowerCase();

  if (isDomestic && insideRate != null) return insideRate;
  if (!isDomestic && outsideRate != null) return outsideRate;
  if (insideRate != null) return insideRate;
  return DEFAULT_SHIPPING_FEE;
};

export const calculateCheckout = async (
  storeId: string,
  input: CheckoutInput,
  options?: { storeCountry?: string; shippingSettings?: StoreShippingSettings },
) => {
  if (!input.items.length) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Cart is empty");
  }

  const store =
    options?.storeCountry != null
      ? null
      : await prisma.store.findUnique({
          where: { id: storeId },
          select: { country: true, shipping: true },
        });

  const storeCountry = options?.storeCountry ?? store?.country ?? "US";
  const shippingSettings =
    options?.shippingSettings ?? parseStoreShipping(store?.shipping ?? null);

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

  const shipping = resolveShippingFee(storeCountry, input.shippingAddress, shippingSettings, subtotal);
  const total = Math.max(subtotal + shipping - discount, 0.01);

  return { lineItems, subtotal, shipping, discount, total, couponCode };
};

export const decrementOrderStock = async (
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  items: CheckoutItemInput[],
) => {
  for (const item of items) {
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } },
    });
  }
};

export const restoreOrderStock = async (orderId: string) => {
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

export const upsertCheckoutCustomer = async (
  storeId: string,
  data: {
    email: string;
    name: string;
    phone?: string;
    shippingAddress: Record<string, unknown>;
    total: number;
  },
) => {
  const email = data.email.toLowerCase();
  const existing = await prisma.customer.findUnique({
    where: { storeId_email: { storeId, email } },
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
      email,
      name: data.name,
      phone: data.phone ?? null,
      orderCount: 1,
      totalSpent: data.total,
      addresses: [data.shippingAddress] as object,
    },
  });
};
