import { StatusCodes } from "http-status-codes";
import AppError from "../errorHelpers/AppError";
import { prisma } from "../lib/prisma";
import { StoreMemberRole } from "../lib/prisma-exports";

export type ResolvedStoreAccess = {
  storeId: string;
  isSuspended: boolean;
  role: "OWNER" | StoreMemberRole;
};

export async function resolveUserStoreAccess(userId: string): Promise<ResolvedStoreAccess | null> {
  const ownedStore = await prisma.store.findUnique({
    where: { ownerId: userId },
    select: { id: true, isSuspended: true },
  });

  if (ownedStore) {
    return { storeId: ownedStore.id, isSuspended: ownedStore.isSuspended, role: "OWNER" };
  }

  const membership = await prisma.storeMember.findFirst({
    where: { userId },
    include: { store: { select: { id: true, isSuspended: true } } },
  });

  if (!membership) return null;

  return {
    storeId: membership.store.id,
    isSuspended: membership.store.isSuspended,
    role: membership.role,
  };
}

export async function assertStoreOwner(storeId: string, userId: string) {
  const store = await prisma.store.findFirst({
    where: { id: storeId, ownerId: userId },
    select: { id: true },
  });

  if (!store) {
    throw new AppError(StatusCodes.FORBIDDEN, "Only the shop owner can manage users and permissions.");
  }

  return store;
}
