import z from "zod";

export const suspendStoreZodSchema = z.object({
  isSuspended: z.boolean(),
});
