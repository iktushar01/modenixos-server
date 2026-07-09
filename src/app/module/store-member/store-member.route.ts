import express from "express";
import { Role } from "../../lib/prisma-exports";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { StoreMemberController } from "./store-member.controller";
import { inviteStoreMemberZodSchema } from "./store-member.validation";

const router = express.Router();

router.get("/me/members", checkAuth(Role.CLIENT), StoreMemberController.listMembers);

router.post(
  "/me/members",
  checkAuth(Role.CLIENT),
  validateRequest(inviteStoreMemberZodSchema),
  StoreMemberController.inviteMember,
);

router.delete(
  "/me/members/:memberId",
  checkAuth(Role.CLIENT),
  StoreMemberController.removeMember,
);

router.delete(
  "/me/invitations/:invitationId",
  checkAuth(Role.CLIENT),
  StoreMemberController.revokeInvitation,
);

router.post(
  "/invitations/:token/accept",
  checkAuth(Role.CLIENT),
  StoreMemberController.acceptInvitation,
);

export const StoreMemberRoute = router;
