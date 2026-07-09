import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../errorHelpers/AppError";
import { Role } from "../lib/prisma-exports";
import { resolveUserStoreAccess } from "../utils/storeAccess";

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

    const access = await resolveUserStoreAccess(req.user.userId);

    if (!access) {
      throw new AppError(StatusCodes.NOT_FOUND, "Store not found. Create a brand first.");
    }

    if (access.isSuspended) {
      throw new AppError(StatusCodes.FORBIDDEN, "Your store has been suspended.");
    }

    req.storeId = access.storeId;
    req.storeRole = access.role;
    next();
  } catch (error) {
    next(error);
  }
};
