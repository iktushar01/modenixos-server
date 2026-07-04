import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../errorHelpers/AppError";
import { prisma } from "../lib/prisma";
import { Role } from "../lib/prisma-exports";

export const attachStoreId = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.userId) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "Unauthorized");
    }

    if (req.user.role !== Role.CLIENT) {
      return next();
    }

    const store = await prisma.store.findUnique({
      where: { ownerId: req.user.userId },
      select: { id: true, isSuspended: true },
    });

    if (!store) {
      throw new AppError(StatusCodes.NOT_FOUND, "Store not found. Create a brand first.");
    }

    if (store.isSuspended) {
      throw new AppError(StatusCodes.FORBIDDEN, "Your store has been suspended.");
    }

    req.storeId = store.id;
    next();
  } catch (error) {
    next(error);
  }
};
