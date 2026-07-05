import prismaPkg from "../../generated/prisma/index";

const prismaModule = prismaPkg as typeof import("../../generated/prisma/index");

export const PrismaClient = prismaModule.PrismaClient;
export const Prisma = prismaModule.Prisma;

export const Role = prismaModule.Role;
export type Role = (typeof Role)[keyof typeof Role];

export const UserStatus = prismaModule.UserStatus;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const Gender = prismaModule.Gender;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const StorePlan = prismaModule.StorePlan;
export type StorePlan = (typeof StorePlan)[keyof typeof StorePlan];

export const ProductStatus = prismaModule.ProductStatus;
export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

export const OrderStatus = prismaModule.OrderStatus;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const CouponType = prismaModule.CouponType;
export type CouponType = (typeof CouponType)[keyof typeof CouponType];

export const ReviewStatus = prismaModule.ReviewStatus;
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export const StoreMemberRole = prismaModule.StoreMemberRole;
export type StoreMemberRole = (typeof StoreMemberRole)[keyof typeof StoreMemberRole];

export const StoreInvitationStatus = prismaModule.StoreInvitationStatus;
export type StoreInvitationStatus = (typeof StoreInvitationStatus)[keyof typeof StoreInvitationStatus];

