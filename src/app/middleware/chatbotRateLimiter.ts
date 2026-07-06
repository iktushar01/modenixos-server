import rateLimit from "express-rate-limit";
import type { Request } from "express";
import { envVars } from "../../config/env";

const isDev = envVars.NODE_ENV === "development";
const windowMs = Number(process.env.CHATBOT_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000);
const maxRequests = Number(process.env.CHATBOT_RATE_LIMIT_MAX ?? 60);

export const chatbotLimiter = rateLimit({
  windowMs,
  max: maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  // Local development should not block chat while testing.
  skip: () => isDev,
  keyGenerator: (req: Request) => {
    const sessionId = (req.body as { sessionId?: string } | undefined)?.sessionId?.trim();
    if (sessionId) return `chat:${sessionId}`;
    return req.ip ?? "unknown";
  },
  message: {
    success: false,
    message: "Too many chat requests. Please wait a few minutes and try again.",
  },
});
