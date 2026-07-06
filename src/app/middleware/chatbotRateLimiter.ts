import rateLimit from "express-rate-limit";
import type { Request } from "express";
import { envVars } from "../../config/env";

const isDev = envVars.NODE_ENV === "development";
const windowMs = Number(process.env.CHATBOT_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000);
const maxRequests = Number(process.env.CHATBOT_RATE_LIMIT_MAX ?? 60);

// #region agent log
fetch("http://127.0.0.1:7520/ingest/ad77b84b-eaea-40fc-9651-0b3ce1c650f2", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "4cfb43" },
  body: JSON.stringify({
    sessionId: "4cfb43",
    hypothesisId: "H1",
    location: "chatbotRateLimiter.ts:init",
    message: "chatbot limiter config at module load",
    data: { isDev, nodeEnv: envVars.NODE_ENV, maxRequests, windowMs },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

export const chatbotLimiter = rateLimit({
  windowMs,
  max: maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  // Local development should not block chat while testing.
  skip: (req) => {
    const shouldSkip = isDev;
    // #region agent log
    fetch("http://127.0.0.1:7520/ingest/ad77b84b-eaea-40fc-9651-0b3ce1c650f2", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "4cfb43" },
      body: JSON.stringify({
        sessionId: "4cfb43",
        hypothesisId: "H4",
        location: "chatbotRateLimiter.ts:skip",
        message: "skip evaluated",
        data: { shouldSkip, isDev, nodeEnv: envVars.NODE_ENV, ip: req.ip },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return shouldSkip;
  },
  keyGenerator: (req: Request) => {
    const sessionId = (req.body as { sessionId?: string } | undefined)?.sessionId?.trim();
    if (sessionId) return `chat:${sessionId}`;
    return req.ip ?? "unknown";
  },
  handler: (req, res, _next, options) => {
    // #region agent log
    fetch("http://127.0.0.1:7520/ingest/ad77b84b-eaea-40fc-9651-0b3ce1c650f2", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "4cfb43" },
      body: JSON.stringify({
        sessionId: "4cfb43",
        hypothesisId: "H1",
        location: "chatbotRateLimiter.ts:handler",
        message: "express rate limit triggered",
        data: { ip: req.ip, statusCode: options.statusCode },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    res.status(options.statusCode).json(options.message);
  },
  message: {
    success: false,
    message: "Too many chat requests. Please wait a few minutes and try again.",
  },
});
