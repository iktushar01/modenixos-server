import rateLimit from "express-rate-limit";
import { envVars } from "../../config/env";

const isDev = envVars.NODE_ENV === "development";

/** Limits brute-force on login/register/password flows only. */
export const credentialAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 1000 : 20,
    skip: () => isDev,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many attempts. Please wait a few minutes and try again.",
    },
});

/** Better Auth native handler — relaxed in dev. */
export const betterAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 2000 : 200,
    skip: () => isDev,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many auth requests. Please try again later.",
    },
});
