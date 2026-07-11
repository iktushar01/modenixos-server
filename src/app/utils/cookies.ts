import type { Response, CookieOptions, Request } from "express";
import { envVars } from "../../config/env";

const BETTER_AUTH_SESSION_COOKIE = "better-auth.session_token";
const SECURE_BETTER_AUTH_SESSION_COOKIE = "__Secure-better-auth.session_token";

const setCookie = (res: Response, key: string, value: string, options: CookieOptions) => {
    res.cookie(key, value, options);
};

const getCookie = (req: Request, key: string) => {
    return req.cookies[key];
};

const clearCookie = (res: Response, key: string, options: CookieOptions) => {
    res.clearCookie(key, options);
};

/** Better Auth prefixes session cookies with __Secure- in production. */
const getBetterAuthSessionCookieName = () =>
    envVars.NODE_ENV === "production"
        ? SECURE_BETTER_AUTH_SESSION_COOKIE
        : BETTER_AUTH_SESSION_COOKIE;

const getBetterAuthSessionToken = (req: Request): string | undefined => {
    const direct =
        req.cookies[BETTER_AUTH_SESSION_COOKIE] ??
        req.cookies[SECURE_BETTER_AUTH_SESSION_COOKIE];

    if (direct) {
        return direct;
    }

    const fallback = Object.entries(req.cookies).find(([name]) =>
        name.endsWith("better-auth.session_token") || name === "__Secure-better-auth.session_token",
    );

    return fallback?.[1];
};

const clearBetterAuthSessionCookie = (res: Response, options: CookieOptions) => {
    clearCookie(res, BETTER_AUTH_SESSION_COOKIE, options);
    clearCookie(res, SECURE_BETTER_AUTH_SESSION_COOKIE, options);
};

export const cookieUtils = {
    setCookie,
    getCookie,
    clearCookie,
    getBetterAuthSessionCookieName,
    getBetterAuthSessionToken,
    clearBetterAuthSessionCookie,
};