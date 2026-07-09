import type { NextFunction, Request, Response } from "express";
import AppError from "../errorHelpers/AppError";
import { prisma } from "../lib/prisma";
import { jwtUtils } from "../utils/jwt";
import { cookieUtils } from "../utils/cookies";
import { Role, UserStatus } from "../lib/prisma-exports";
import { StatusCodes } from "http-status-codes";
import { envVars } from "../../config/env";

export const checkAuth = (...authRoles: Role[]) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        //Access Token Verification — prefer JWT path to avoid redundant session DB lookups
        const accessToken = cookieUtils.getCookie(req, 'accessToken');

        if (accessToken) {
            const verifiedToken = jwtUtils.verifyToken(accessToken, envVars.ACCESS_TOKEN_SECRET);

            if (verifiedToken.success) {
                req.user = verifiedToken.decoded as any;

                const isUserExist = await prisma.user.findUnique({
                    where: { id: (verifiedToken.decoded as any).userId },
                    select: { id: true, status: true, isDeleted: true, role: true },
                });

                if (!isUserExist) {
                    throw new AppError(StatusCodes.UNAUTHORIZED, 'Unauthorized access! User no longer exists.');
                }

                if (isUserExist.status === UserStatus.SUSPENDED || isUserExist.status === UserStatus.DELETED || isUserExist.isDeleted) {
                    throw new AppError(StatusCodes.UNAUTHORIZED, 'Unauthorized access! User is not active or has been deleted.');
                }

                if (authRoles.length > 0 && !authRoles.includes(isUserExist.role as Role)) {
                    throw new AppError(StatusCodes.FORBIDDEN, 'Forbidden access! You do not have permission to access this resource.');
                }

                return next();
            }
        }

        //Session Token Verification (fallback when JWT is missing/invalid)
        const sessionToken = cookieUtils.getBetterAuthSessionToken(req);

        if (sessionToken) {
            const sessionExists = await prisma.session.findFirst({
                where: {
                    token: sessionToken,
                    expiresAt: {
                        gt: new Date(),
                    }
                },
                include: {
                    user: true,
                }
            })

            if (sessionExists && sessionExists.user) {
                const user = sessionExists.user;

                const now = new Date();
                const expiresAt = new Date(sessionExists.expiresAt)
                const createdAt = new Date(sessionExists.createdAt)

                const sessionLifeTime = expiresAt.getTime() - createdAt.getTime();
                const timeRemaining = expiresAt.getTime() - now.getTime();
                const percentRemaining = (timeRemaining / sessionLifeTime) * 100;

                if (percentRemaining < 20) {
                    res.setHeader('X-Session-Refresh', 'true');
                    res.setHeader('X-Session-Expires-At', expiresAt.toISOString());
                    res.setHeader('X-Time-Remaining', timeRemaining.toString());

                    console.log("Session Expiring Soon!!");
                }

                if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DELETED) {
                    throw new AppError(StatusCodes.UNAUTHORIZED, 'Unauthorized access! User is not active.');
                }

                if (user.isDeleted) {
                    throw new AppError(StatusCodes.UNAUTHORIZED, 'Unauthorized access! User is deleted.');
                }

                if (authRoles.length > 0 && !authRoles.includes(user.role)) {
                    throw new AppError(StatusCodes.FORBIDDEN, 'Forbidden access! You do not have permission to access this resource.');
                }

                req.user = {
                    ...user,
                    userId: user.id,
                } as any;
                return next();
            }
        }

        if (!accessToken) {
            throw new AppError(StatusCodes.UNAUTHORIZED, 'Unauthorized access! No access token provided.');
        }

        throw new AppError(StatusCodes.UNAUTHORIZED, 'Unauthorized access! Invalid access token.');
    } catch (error: any) {
        next(error);
    }
};
