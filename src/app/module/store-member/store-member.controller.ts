import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { StoreMemberService } from "./store-member.service";
import { resolveUserStoreAccess } from "../../utils/storeAccess";
import AppError from "../../errorHelpers/AppError";

const listMembers = catchAsync(async (req: Request, res: Response) => {
  const access = await resolveUserStoreAccess(req.user!.userId);
  if (!access) {
    throw new AppError(StatusCodes.NOT_FOUND, "Store not found");
  }

  const result = await StoreMemberService.listMembers(access.storeId, req.user!.userId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Shop users retrieved",
    data: result,
  });
});

const inviteMember = catchAsync(async (req: Request, res: Response) => {
  const access = await resolveUserStoreAccess(req.user!.userId);
  if (!access) {
    throw new AppError(StatusCodes.NOT_FOUND, "Store not found");
  }

  const result = await StoreMemberService.inviteMember(access.storeId, req.user!.userId, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: result.type === "member" ? "User added to your shop" : "Invitation sent",
    data: result,
  });
});

const removeMember = catchAsync(async (req: Request, res: Response) => {
  const access = await resolveUserStoreAccess(req.user!.userId);
  if (!access) {
    throw new AppError(StatusCodes.NOT_FOUND, "Store not found");
  }

  await StoreMemberService.removeMember(
    access.storeId,
    req.user!.userId,
    req.params.memberId as string,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User removed from your shop",
    data: null,
  });
});

const revokeInvitation = catchAsync(async (req: Request, res: Response) => {
  const access = await resolveUserStoreAccess(req.user!.userId);
  if (!access) {
    throw new AppError(StatusCodes.NOT_FOUND, "Store not found");
  }

  await StoreMemberService.revokeInvitation(
    access.storeId,
    req.user!.userId,
    req.params.invitationId as string,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Invitation revoked",
    data: null,
  });
});

const acceptInvitation = catchAsync(async (req: Request, res: Response) => {
  const result = await StoreMemberService.acceptInvitation(
    req.params.token as string,
    req.user!.userId,
    req.user!.email,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `You now have access to ${result.storeName}`,
    data: result,
  });
});

export const StoreMemberController = {
  listMembers,
  inviteMember,
  removeMember,
  revokeInvitation,
  acceptInvitation,
};
