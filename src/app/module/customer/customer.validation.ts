import z from "zod";

const optionalPhone = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? null : val),
  z.string().max(20).trim().nullable().optional(),
);

export const createCustomerZodSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().trim(),
  password: z.string().min(6).max(100),
  phone: optionalPhone,
});

export const updateCustomerZodSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  email: z.string().email().trim().optional(),
  phone: optionalPhone,
  password: z.string().min(6).max(100).optional(),
  removeAccount: z.boolean().optional(),
});
