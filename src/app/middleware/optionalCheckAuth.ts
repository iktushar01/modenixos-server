import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { jwtUtils } from "../utils/jwt";
import { cookieUtils } from "../utils/cookies";
import { UserStatus } from "../lib/prisma-exports";
import { envVars } from "../../config/env";

/** Sets req.user when a valid session exists; never rejects unauthenticated requests. */
export const optionalCheckAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const accessToken = cookieUtils.getCookie(req, "accessToken");

    if (accessToken) {
      const verifiedToken = jwtUtils.verifyToken(accessToken, envVars.ACCESS_TOKEN_SECRET);
      if (verifiedToken.success) {
        const decoded = verifiedToken.decoded as { userId: string; role: string };
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, status: true, isDeleted: true, role: true },
        });

        if (user && user.status !== UserStatus.SUSPENDED && user.status !== UserStatus.DELETED && !user.isDeleted) {
          (req as Request & { user?: { userId: string; role: string } }).user = {
            userId: user.id,
            role: user.role,
          };
          return next();
        }
      }
    }

    const sessionToken = cookieUtils.getCookie(req, "better-auth.session_token");
    if (sessionToken) {
      const session = await prisma.session.findFirst({
        where: { token: sessionToken, expiresAt: { gt: new Date() } },
        include: { user: { select: { id: true, role: true, status: true, isDeleted: true } } },
      });

      if (
        session?.user &&
        session.user.status !== UserStatus.SUSPENDED &&
        session.user.status !== UserStatus.DELETED &&
        !session.user.isDeleted
      ) {
        (req as Request & { user?: { userId: string; role: string } }).user = {
          userId: session.user.id,
          role: session.user.role,
        };
      }
    }
  } catch {
    // Ignore auth errors for optional middleware
  }

  next();
};
