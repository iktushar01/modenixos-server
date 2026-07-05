import { randomUUID } from "node:crypto";
import { StatusCodes } from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { StoreInvitationStatus, StoreMemberRole } from "../../lib/prisma-exports";
import { sendEmail } from "../../utils/email";
import { envVars } from "../../../config/env";
import { assertStoreOwner } from "../../utils/storeAccess";

const INVITE_EXPIRY_DAYS = 7;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const listMembers = async (storeId: string, currentUserId: string) => {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: {
      owner: { select: { id: true, name: true, email: true, image: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      invitations: {
        where: { status: StoreInvitationStatus.PENDING },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!store) {
    throw new AppError(StatusCodes.NOT_FOUND, "Store not found");
  }

  return {
    owner: {
      id: store.owner.id,
      userId: store.owner.id,
      name: store.owner.name,
      email: store.owner.email,
      image: store.owner.image,
      role: "OWNER" as const,
      isCurrentUser: store.owner.id === currentUserId,
    },
    members: store.members.map((member) => ({
      id: member.id,
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
      image: member.user.image,
      role: member.role,
      isCurrentUser: member.user.id === currentUserId,
      createdAt: member.createdAt,
    })),
    invitations: store.invitations.map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    })),
  };
};

const inviteMember = async (
  storeId: string,
  ownerId: string,
  payload: { email: string; role: StoreMemberRole },
) => {
  await assertStoreOwner(storeId, ownerId);

  const email = normalizeEmail(payload.email);
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: { owner: { select: { email: true, name: true } } },
  });

  if (!store) {
    throw new AppError(StatusCodes.NOT_FOUND, "Store not found");
  }

  if (email === normalizeEmail(store.owner.email)) {
    throw new AppError(StatusCodes.BAD_REQUEST, "The shop owner already has access.");
  }

  const existingMember = await prisma.storeMember.findFirst({
    where: { storeId, user: { email } },
  });
  if (existingMember) {
    throw new AppError(StatusCodes.CONFLICT, "This user already has access to your shop.");
  }

  const pendingInvite = await prisma.storeInvitation.findFirst({
    where: { storeId, email, status: StoreInvitationStatus.PENDING },
  });
  if (pendingInvite) {
    throw new AppError(StatusCodes.CONFLICT, "An invitation is already pending for this email.");
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    const member = await prisma.storeMember.create({
      data: {
        storeId,
        userId: existingUser.id,
        role: payload.role,
        invitedBy: ownerId,
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    return {
      type: "member" as const,
      member: {
        id: member.id,
        userId: member.user.id,
        name: member.user.name,
        email: member.user.email,
        image: member.user.image,
        role: member.role,
        isCurrentUser: false,
        createdAt: member.createdAt,
      },
    };
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

  const invitation = await prisma.storeInvitation.create({
    data: {
      storeId,
      email,
      role: payload.role,
      invitedBy: ownerId,
      expiresAt,
      token: randomUUID(),
    },
  });

  const inviteUrl = `${envVars.FRONTEND_URL}/invite/${invitation.token}`;

  try {
    await sendEmail({
      to: email,
      subject: `You've been invited to ${store.brandName}`,
      templateName: "storeInvite",
      templateData: {
        inviterName: store.owner.name,
        storeName: store.brandName,
        role: payload.role,
        inviteUrl,
        expiresAt: expiresAt.toLocaleDateString(),
      },
    });
  } catch {
    // Invitation is still created even if email fails
  }

  return {
    type: "invitation" as const,
    invitation: {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    },
  };
};

const removeMember = async (storeId: string, ownerId: string, memberId: string) => {
  await assertStoreOwner(storeId, ownerId);

  const member = await prisma.storeMember.findFirst({
    where: { id: memberId, storeId },
  });

  if (!member) {
    throw new AppError(StatusCodes.NOT_FOUND, "Team member not found");
  }

  await prisma.storeMember.delete({ where: { id: memberId } });
};

const revokeInvitation = async (storeId: string, ownerId: string, invitationId: string) => {
  await assertStoreOwner(storeId, ownerId);

  const invitation = await prisma.storeInvitation.findFirst({
    where: { id: invitationId, storeId, status: StoreInvitationStatus.PENDING },
  });

  if (!invitation) {
    throw new AppError(StatusCodes.NOT_FOUND, "Invitation not found");
  }

  await prisma.storeInvitation.update({
    where: { id: invitationId },
    data: { status: StoreInvitationStatus.REVOKED },
  });
};

const acceptInvitation = async (token: string, userId: string, userEmail: string) => {
  const invitation = await prisma.storeInvitation.findUnique({
    where: { token },
    include: { store: { select: { id: true, brandName: true } } },
  });

  if (!invitation || invitation.status !== StoreInvitationStatus.PENDING) {
    throw new AppError(StatusCodes.NOT_FOUND, "Invitation not found or already used.");
  }

  if (invitation.expiresAt < new Date()) {
    await prisma.storeInvitation.update({
      where: { id: invitation.id },
      data: { status: StoreInvitationStatus.EXPIRED },
    });
    throw new AppError(StatusCodes.BAD_REQUEST, "This invitation has expired.");
  }

  if (normalizeEmail(userEmail) !== normalizeEmail(invitation.email)) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "Sign in with the email address that received this invitation.",
    );
  }

  const existingMember = await prisma.storeMember.findUnique({
    where: { storeId_userId: { storeId: invitation.storeId, userId } },
  });

  if (existingMember) {
    await prisma.storeInvitation.update({
      where: { id: invitation.id },
      data: { status: StoreInvitationStatus.ACCEPTED },
    });
    return { storeId: invitation.storeId, storeName: invitation.store.brandName };
  }

  await prisma.$transaction([
    prisma.storeMember.create({
      data: {
        storeId: invitation.storeId,
        userId,
        role: invitation.role,
        invitedBy: invitation.invitedBy,
      },
    }),
    prisma.storeInvitation.update({
      where: { id: invitation.id },
      data: { status: StoreInvitationStatus.ACCEPTED },
    }),
  ]);

  return { storeId: invitation.storeId, storeName: invitation.store.brandName };
};

export const StoreMemberService = {
  listMembers,
  inviteMember,
  removeMember,
  revokeInvitation,
  acceptInvitation,
};
