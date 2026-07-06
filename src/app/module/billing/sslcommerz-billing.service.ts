import { randomBytes } from "node:crypto";
import { StatusCodes } from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { InvoiceStatus, StorePlan, SubscriptionStatus } from "../../lib/prisma-exports";
import { PLAN_LIMITS } from "../../../config/planLimits";
import { sslcommerzConfig } from "../../../config/sslcommerz.config";
import { ensureStoreSubscription } from "../../utils/subscription";
import { SslCommerzService } from "../payment/sslcommerz.service";

const BILLING_PERIOD_DAYS = 30;

const generateBillingTransactionId = () =>
  `BILL-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;

const findBillingInvoice = async (tranId?: string, invoiceId?: string) => {
  if (tranId) {
    const invoice = await prisma.invoice.findUnique({
      where: { transactionId: tranId },
      include: { store: { select: { brandName: true } } },
    });
    if (invoice) return invoice;
  }

  if (invoiceId) {
    return prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { store: { select: { brandName: true } } },
    });
  }

  return null;
};

const activateSslBilling = async (
  invoiceId: string,
  valId: string,
  gatewayResponse: Record<string, unknown>,
) => {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice || invoice.provider !== "SSLCOMMERZ") {
      throw new AppError(StatusCodes.NOT_FOUND, "Billing invoice not found");
    }

    if (invoice.status === InvoiceStatus.PAID) {
      return invoice;
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + BILLING_PERIOD_DAYS);

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.PAID,
        validationId: valId,
        paidAt: now,
        gatewayResponse: gatewayResponse as object,
      },
    });

    await tx.subscription.update({
      where: { storeId: invoice.storeId },
      data: {
        plan: StorePlan.PRO,
        status: SubscriptionStatus.ACTIVE,
        billingProvider: "SSLCOMMERZ",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      },
    });

    await tx.store.update({
      where: { id: invoice.storeId },
      data: { plan: StorePlan.PRO },
    });

    return invoice;
  });
};

const markBillingInvoiceFailed = async (invoiceId: string, gatewayResponse: Record<string, unknown>) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.status === InvoiceStatus.PAID) return invoice;

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: InvoiceStatus.VOID,
      gatewayResponse: gatewayResponse as object,
    },
  });
};

const createSslBillingCheckout = async (
  storeId: string,
  owner: { email: string; name: string },
  targetPlan: StorePlan,
) => {
  if (!sslcommerzConfig.isConfigured) {
    throw new AppError(
      StatusCodes.SERVICE_UNAVAILABLE,
      "SSLCommerz is not configured. Add SSLC_STORE_ID and SSLC_STORE_PASSWORD.",
    );
  }

  if (targetPlan !== StorePlan.PRO) {
    throw new AppError(StatusCodes.BAD_REQUEST, "SSLCommerz checkout is only available for the Growth plan.");
  }

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new AppError(StatusCodes.NOT_FOUND, "Store not found");

  const subscription = await ensureStoreSubscription(storeId);
  const transactionId = generateBillingTransactionId();
  const amount = sslcommerzConfig.billingProAmountBdt;

  const invoice = await prisma.invoice.create({
    data: {
      storeId,
      subscriptionId: subscription.id,
      amount,
      currency: "bdt",
      status: InvoiceStatus.OPEN,
      provider: "SSLCOMMERZ",
      transactionId,
    },
  });

  const initResponse = await SslCommerzService.initPayment({
    total_amount: amount,
    currency: "BDT",
    tran_id: transactionId,
    success_url: sslcommerzConfig.billingSuccessUrl,
    fail_url: sslcommerzConfig.billingFailUrl,
    cancel_url: sslcommerzConfig.billingCancelUrl,
    ipn_url: sslcommerzConfig.billingIpnUrl,
    cus_name: owner.name,
    cus_email: owner.email,
    cus_phone: "01700000000",
    cus_add1: "N/A",
    cus_city: "Dhaka",
    cus_postcode: "1000",
    cus_country: "Bangladesh",
    shipping_method: "NO",
    num_of_item: 1,
    product_name: `ModenixOS ${PLAN_LIMITS.PRO.label} Plan`,
    product_category: "Subscription",
    product_profile: "non-physical-goods",
    value_a: storeId,
    value_b: invoice.id,
  });

  if (initResponse.status !== "SUCCESS" || !initResponse.GatewayPageURL) {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: InvoiceStatus.VOID, gatewayResponse: initResponse as object },
    });
    throw new AppError(
      StatusCodes.BAD_GATEWAY,
      initResponse.failedreason ?? "Failed to initialize SSLCommerz billing session",
    );
  }

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { gatewayResponse: initResponse as object },
  });

  console.info("[billing] SSLCommerz session initialized", { storeId, transactionId, amount });

  return { url: initResponse.GatewayPageURL };
};

const processSuccessCallback = async (payload: Record<string, string>) => {
  const tranId = payload.tran_id;
  const valId = payload.val_id;
  const invoiceId = payload.value_b;

  const invoice = await findBillingInvoice(tranId, invoiceId);
  if (!invoice) {
    throw new AppError(StatusCodes.NOT_FOUND, "Billing invoice not found");
  }

  if (!valId) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Missing validation id");
  }

  const validation = await SslCommerzService.validatePayment(valId);
  const isValid = validation.status === "VALID" || validation.status === "VALIDATED";

  if (!isValid || validation.tran_id !== invoice.transactionId) {
    await markBillingInvoiceFailed(invoice.id, { ...payload, validation });
    return {
      redirectUrl: `${sslcommerzConfig.frontendUrl}/dashboard/settings/billing?checkout=failed&provider=ssl`,
    };
  }

  const validatedAmount = Number(validation.amount ?? validation.store_amount ?? 0);
  if (Math.abs(validatedAmount - Number(invoice.amount)) > 0.01) {
    await markBillingInvoiceFailed(invoice.id, { ...payload, validation, reason: "amount_mismatch" });
    return {
      redirectUrl: `${sslcommerzConfig.frontendUrl}/dashboard/settings/billing?checkout=failed&provider=ssl`,
    };
  }

  await activateSslBilling(invoice.id, valId, { ...payload, validation });

  return {
    redirectUrl: `${sslcommerzConfig.frontendUrl}/dashboard/settings/billing?checkout=success&provider=ssl`,
  };
};

const processFailCallback = async (payload: Record<string, string>) => {
  const invoice = await findBillingInvoice(payload.tran_id, payload.value_b);
  if (invoice) {
    await markBillingInvoiceFailed(invoice.id, payload);
  }

  return {
    redirectUrl: `${sslcommerzConfig.frontendUrl}/dashboard/settings/billing?checkout=failed&provider=ssl`,
  };
};

const processCancelCallback = async (payload: Record<string, string>) => {
  const invoice = await findBillingInvoice(payload.tran_id, payload.value_b);
  if (invoice) {
    await markBillingInvoiceFailed(invoice.id, { ...payload, cancelled: true });
  }

  return {
    redirectUrl: `${sslcommerzConfig.frontendUrl}/dashboard/settings/billing?checkout=cancelled&provider=ssl`,
  };
};

const processIpnCallback = async (payload: Record<string, string>) => {
  const valId = payload.val_id;
  const tranId = payload.tran_id;

  if (!valId || !tranId) {
    return { ok: false, message: "Missing val_id or tran_id" };
  }

  const invoice = await findBillingInvoice(tranId, payload.value_b);
  if (!invoice) return { ok: false, message: "Billing invoice not found" };

  if (invoice.status === InvoiceStatus.PAID) {
    return { ok: true, message: "Already processed" };
  }

  const validation = await SslCommerzService.validatePayment(valId);
  const isValid = validation.status === "VALID" || validation.status === "VALIDATED";

  if (isValid && validation.tran_id === invoice.transactionId) {
    await activateSslBilling(invoice.id, valId, { ...payload, validation, source: "ipn" });
    return { ok: true, message: "Billing payment confirmed via IPN" };
  }

  return { ok: false, message: "Validation failed" };
};

export const SslCommerzBillingService = {
  createSslBillingCheckout,
  processSuccessCallback,
  processFailCallback,
  processCancelCallback,
  processIpnCallback,
};
