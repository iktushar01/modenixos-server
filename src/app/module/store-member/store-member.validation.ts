import z from "zod";
import { StoreMemberRole } from "../../lib/prisma-exports";

export const inviteStoreMemberZodSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  role: z.nativeEnum(StoreMemberRole),
});

export const updateStoreMemberRoleZodSchema = z.object({
  role: z.nativeEnum(StoreMemberRole),
});
