import { Router } from "express";
import { StatusCodes } from "http-status-codes";

import { prisma } from "../lib/prisma";
import { catchAsync } from "../shared/catchAsync";
import { sendResponse } from "../shared/sendResponse";

const HealthRoute = Router();

HealthRoute.get(
  "/",
  catchAsync(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Service is healthy",
      data: {
        status: "ok",
        database: "connected",
      },
    });
  }),
);

export { HealthRoute };
