import rateLimit from "express-rate-limit";
import { envVars } from "../../config/env";

const isDev = envVars.NODE_ENV === "development";

export const chatbotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 200 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many chat requests. Please wait a few minutes and try again.",
  },
});
