import z from "zod";

const historyMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

export const chatbotMessageSchema = z.object({
  message: z.string().min(1).max(1000),
  sessionId: z.string().min(8).max(64).optional(),
  history: z.array(historyMessageSchema).max(10).optional(),
});
