import { StatusCodes } from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { CouponType } from "../../lib/prisma-exports";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { assertCouponsAllowed } from "../../utils/planEnforcement";

const createCoupon = async (
  storeId: string,
  payload: {
    code: string;
    type: CouponType;
    value: number;
    minOrder?: number;
    usageLimit?: number;
    expiresAt?: Date;
    isActive?: boolean;
  },
) => {
  await assertCouponsAllowed(storeId);

  try {
    return await prisma.coupon.create({
      data: {
        storeId,
        code: payload.code.toUpperCase(),
        type: payload.type,
        value: payload.value,
        minOrder: payload.minOrder ?? 0,
        usageLimit: payload.usageLimit ?? null,
        expiresAt: payload.expiresAt ?? null,
        isActive: payload.isActive ?? true,
      },
    });
  } catch {
    throw new AppError(StatusCodes.CONFLICT, "Coupon code already exists");
  }
};

const getCoupons = async (storeId: string, query: Record<string, unknown>) => {
  return new QueryBuilder(prisma.coupon as any, query, {
    searchableFields: ["code"],
    filterableFields: ["isActive", "type"],
  })
    .where({ storeId })
    .search()
    .filter()
    .sort()
    .paginate()
    .execute();
};

const updateCoupon = async (storeId: string, id: string, payload: Record<string, unknown>) => {
  const coupon = await prisma.coupon.findFirst({ where: { id, storeId } });
  if (!coupon) throw new AppError(StatusCodes.NOT_FOUND, "Coupon not found");
  return prisma.coupon.update({
    where: { id },
    data: {
      ...payload,
      ...(payload.code ? { code: (payload.code as string).toUpperCase() } : {}),
    },
  });
};

const deleteCoupon = async (storeId: string, id: string) => {
  const coupon = await prisma.coupon.findFirst({ where: { id, storeId } });
  if (!coupon) throw new AppError(StatusCodes.NOT_FOUND, "Coupon not found");
  await prisma.coupon.delete({ where: { id } });
};

const validateCoupon = async (storeId: string, code: string, subtotal: number) => {
  const coupon = await prisma.coupon.findFirst({
    where: { storeId, code: code.toUpperCase(), isActive: true },
  });

  if (!coupon) throw new AppError(StatusCodes.NOT_FOUND, "Invalid coupon code");
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Coupon has expired");
  }
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Coupon usage limit reached");
  }
  if (subtotal < coupon.minOrder) {
    throw new AppError(StatusCodes.BAD_REQUEST, `Minimum order of ${coupon.minOrder} required`);
  }

  const discount =
    coupon.type === CouponType.PERCENT
      ? (subtotal * coupon.value) / 100
      : coupon.value;

  return { coupon, discount: Math.min(discount, subtotal) };
};

export const CouponService = { createCoupon, getCoupons, updateCoupon, deleteCoupon, validateCoupon };
