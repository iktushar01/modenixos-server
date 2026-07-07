import path from "node:path";
import ejs from "ejs";
import { StatusCodes } from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";

const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

const buildInvoiceData = async (orderId: string, storeId?: string) => {
  const order = await prisma.order.findFirst({
    where: storeId ? { id: orderId, storeId } : { id: orderId },
    include: { store: { select: { brandName: true, slug: true, currency: true, country: true } } },
  });
  if (!order) throw new AppError(StatusCodes.NOT_FOUND, "Order not found");

  const currency = order.store.currency ?? "USD";
  const items = order.items as Array<{
    name: string;
    price: number;
    quantity: number;
    size?: string;
    color?: string;
  }>;

  return {
    order,
    invoice: {
      invoiceNumber: order.invoiceNumber ?? order.orderNumber,
      orderNumber: order.orderNumber,
      issuedAt: order.createdAt,
      storeName: order.store.brandName,
      storeCountry: order.store.country,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      shippingAddress: order.shippingAddress as Record<string, string>,
      items: items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: formatMoney(item.price, currency),
        lineTotal: formatMoney(item.price * item.quantity, currency),
        variant: [item.size, item.color].filter(Boolean).join(" / ") || null,
      })),
      subtotal: formatMoney(order.subtotal, currency),
      shipping: formatMoney(order.shipping, currency),
      discount: order.discount > 0 ? formatMoney(order.discount, currency) : null,
      total: formatMoney(order.total, currency),
      paymentMethod: order.paymentMethod,
      status: order.status,
      currency,
    },
  };
};

const renderInvoiceHtml = async (orderId: string, storeId?: string) => {
  const { invoice } = await buildInvoiceData(orderId, storeId);
  const templatePath = path.resolve(process.cwd(), "src/app/templates/invoice.ejs");
  return ejs.renderFile(templatePath, invoice);
};

const getInvoiceForOwner = async (storeId: string, orderId: string) => buildInvoiceData(orderId, storeId);

const getInvoiceForCustomer = async (
  storeId: string,
  orderNumber: string,
  customerEmail: string,
) => {
  const order = await prisma.order.findFirst({
    where: { storeId, orderNumber, customerEmail: customerEmail.toLowerCase() },
  });
  if (!order) throw new AppError(StatusCodes.NOT_FOUND, "Order not found");
  return buildInvoiceData(order.id, storeId);
};

export const InvoiceService = {
  renderInvoiceHtml,
  getInvoiceForOwner,
  getInvoiceForCustomer,
};
