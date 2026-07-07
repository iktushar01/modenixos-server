import { StatusCodes } from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { OrderStatus } from "../../lib/prisma-exports";

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PACKED, OrderStatus.CANCELLED],
  [OrderStatus.PACKED]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

export const assertValidStatusTransition = (from: OrderStatus, to: OrderStatus) => {
  if (from === to) return;
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `Cannot change order status from ${from} to ${to}`,
    );
  }
};

export const shouldRestoreStockOnStatus = (from: OrderStatus, to: OrderStatus) =>
  to === OrderStatus.CANCELLED && from !== OrderStatus.CANCELLED;

export type StatusHistoryEntry = {
  status: OrderStatus;
  at: string;
  note?: string;
};

export const appendStatusHistory = (
  existing: unknown,
  status: OrderStatus,
  note?: string,
): StatusHistoryEntry[] => {
  const history = Array.isArray(existing) ? (existing as StatusHistoryEntry[]) : [];
  return [...history, { status, at: new Date().toISOString(), ...(note ? { note } : {}) }];
};
