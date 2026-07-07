import { envVars } from "../../../config/env";
import { sslcommerzConfig } from "../../../config/sslcommerz.config";
import { sendEmail } from "../../utils/email";

type OrderEmailPayload = {
  id: string;
  orderNumber: string;
  invoiceNumber?: string | null;
  customerName: string;
  customerEmail: string;
  paymentMethod: string;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  items: unknown;
  trackingNumber?: string | null;
  trackingCarrier?: string | null;
  store: { brandName: string; slug: string; currency: string };
};

type PaymentEmailPayload = {
  amount: number;
  currency: string;
  transactionId: string;
  paidAt?: Date | null;
};

const storeBaseUrl = (slug: string) =>
  `${sslcommerzConfig.frontendUrl}/store/${encodeURIComponent(slug)}`;

const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

const orderItems = (order: OrderEmailPayload) => {
  const items = order.items as Array<{ name: string; price: number; quantity: number }>;
  return items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    lineTotal: formatMoney(item.price * item.quantity, "USD"),
  }));
};

const safeSend = async (fn: () => Promise<unknown>) => {
  try {
    await fn();
  } catch (error) {
    console.error("[order-email] Failed to send email", error);
  }
};

const sendOrderPlacedEmail = async (order: OrderEmailPayload) => {
  const currency = order.store.currency ?? "USD";
  await safeSend(() =>
    sendEmail({
      to: order.customerEmail,
      subject: `Order confirmed — ${order.orderNumber}`,
      templateName: "orderConfirmation",
      templateData: {
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        invoiceNumber: order.invoiceNumber,
        storeName: order.store.brandName,
        paymentMethod: order.paymentMethod,
        items: orderItems(order).map((item) => ({
          ...item,
          lineTotal: item.lineTotal.replace("$", currency === "BDT" ? "৳" : "$"),
        })),
        subtotal: formatMoney(order.subtotal, currency),
        shipping: formatMoney(order.shipping, currency),
        discount: order.discount > 0 ? formatMoney(order.discount, currency) : null,
        total: formatMoney(order.total, currency),
        orderUrl: `${storeBaseUrl(order.store.slug)}/account/orders/${encodeURIComponent(order.orderNumber)}`,
        trackUrl: `${storeBaseUrl(order.store.slug)}/orders/track?orderNumber=${encodeURIComponent(order.orderNumber)}&email=${encodeURIComponent(order.customerEmail)}`,
      },
    }),
  );
};

const sendPaymentReceiptEmail = async (order: OrderEmailPayload, payment: PaymentEmailPayload) => {
  const currency = payment.currency ?? order.store.currency ?? "USD";
  await safeSend(() =>
    sendEmail({
      to: order.customerEmail,
      subject: `Payment received — ${order.orderNumber}`,
      templateName: "orderPaymentReceipt",
      templateData: {
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        storeName: order.store.brandName,
        amount: formatMoney(payment.amount, currency),
        transactionId: payment.transactionId,
        paidAt: payment.paidAt?.toISOString() ?? new Date().toISOString(),
        orderUrl: `${storeBaseUrl(order.store.slug)}/account/orders/${encodeURIComponent(order.orderNumber)}`,
      },
    }),
  );
};

const sendOrderStatusEmail = async (
  order: OrderEmailPayload,
  previousStatus: string,
  newStatus: string,
) => {
  const templateName =
    newStatus === "SHIPPED"
      ? "orderShipped"
      : newStatus === "CANCELLED"
        ? "orderCancelled"
        : "orderStatusUpdate";

  await safeSend(() =>
    sendEmail({
      to: order.customerEmail,
      subject: `Order ${order.orderNumber} — ${newStatus.toLowerCase()}`,
      templateName,
      templateData: {
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        storeName: order.store.brandName,
        previousStatus,
        newStatus,
        trackingNumber: order.trackingNumber,
        trackingCarrier: order.trackingCarrier,
        orderUrl: `${storeBaseUrl(order.store.slug)}/account/orders/${encodeURIComponent(order.orderNumber)}`,
      },
    }),
  );
};

const sendOwnerNewOrderEmail = async (order: OrderEmailPayload, ownerEmail: string) => {
  const currency = order.store.currency ?? "USD";
  await safeSend(() =>
    sendEmail({
      to: ownerEmail,
      subject: `New order ${order.orderNumber} — ${order.store.brandName}`,
      templateName: "ownerNewOrder",
      templateData: {
        orderNumber: order.orderNumber,
        storeName: order.store.brandName,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        paymentMethod: order.paymentMethod,
        total: formatMoney(order.total, currency),
        dashboardUrl: `${sslcommerzConfig.frontendUrl}/dashboard/orders/${order.id}`,
        appName: envVars.APP_NAME,
      },
    }),
  );
};

export const OrderEmailService = {
  sendOrderPlacedEmail,
  sendPaymentReceiptEmail,
  sendOrderStatusEmail,
  sendOwnerNewOrderEmail,
};
