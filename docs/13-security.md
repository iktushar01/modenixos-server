# Security Considerations

[← Back to index](README.md)

## Implemented controls

### Transport & headers

| Control | Implementation |
|---------|----------------|
| Security headers | Helmet (`app.ts`) |
| CORS | Restricted origins: `FRONTEND_URL`, `BETTER_AUTH_URL`, localhost |
| HTTPS cookies | `secure: true`, `sameSite: "none"` in production (`auth.ts`) |

### Authentication

| Control | Implementation |
|---------|----------------|
| HTTP-only cookies | JWT tokens not accessible to JavaScript |
| Password hashing | Better Auth credential provider |
| Email verification | Required for clients (OTP via Better Auth plugin) |
| Account lockout fields | `failedLoginAttempts`, `lockedUntil` on User model |
| Session expiry | Configurable JWT and Better Auth session TTL |
| Role checks | `checkAuth` middleware on protected routes |

### Rate limiting

| Endpoint group | Limit (production) |
|----------------|-------------------|
| Credential auth | 20 / 15 min |
| Better Auth handler | 200 / 15 min |
| Chatbot | 60 / 15 min |

### Input validation

- All API inputs validated with **Zod** schemas via `validateRequest` middleware
- File uploads: type filter (images + PDF only), 10 MB limit
- Prisma unique constraint errors sanitized to generic conflict message

### Payment security

- Stripe webhooks verified with `STRIPE_WEBHOOK_SECRET`
- SSLCommerz validation via gateway validation API

### Data isolation

- Store-scoped queries use `req.storeId` from `attachStoreId` / `resolvePublicStore`
- Storefront customer tokens scoped to `storeId` + `slug`

---

## Security recommendations for production

| Area | Recommendation |
|------|----------------|
| Secrets | Rotate `SUPER_ADMIN_PASSWORD`, JWT secrets, and `BETTER_AUTH_SECRET` before go-live |
| Database | Use SSL connections; restrict network access |
| CORS | Remove localhost origins from production `corsOptions` if not needed |
| Admin access | Limit `SUPER_ADMIN` accounts; audit admin creation |
| Stripe | Use live keys only in production; restrict webhook endpoint |
| SSLCommerz | Set `SSLC_IS_LIVE=true` only with live credentials |
| Logging | Avoid logging tokens, passwords, or PII in production |
| Dependencies | Run `npm audit` / `pnpm audit` regularly |

---

## Known security gaps

| Gap | Risk | Mitigation |
|-----|------|------------|
| Store member roles not enforced | Members have owner-level API access | Implement role checks before production multi-user use |
| Debug telemetry in `chatbotRateLimiter.ts` and `globalErrorhandler.ts` | Outbound fetch to `127.0.0.1:7520` on errors/rate limits | Remove debug blocks before production |
| Google OAuth env required even if unused | Startup requires placeholder values | Provide valid or dummy credentials |
| No CSRF tokens on API | Mitigated by SameSite cookies + CORS | Consider CSRF for cookie-based mutations |
| No API request signing | Standard for cookie auth apps | Ensure strict CORS origin list |
| `user` cookie readable by JS | Role/email exposed to client scripts | Acceptable for UX; do not store sensitive data |

---

## Sensitive data inventory

| Data | Storage |
|------|---------|
| User passwords | Hashed in `Account.password` (Better Auth) |
| Storefront customer passwords | `Customer.passwordHash` |
| Payment card data | Stripe (not stored locally) |
| Session tokens | `Session` table + cookies |
| OTP codes | `Verification` table (Better Auth) |

---

## Related documentation

- [Authentication](07-authentication.md)
- [Known Limitations](15-known-limitations.md)
- [Environment Variables](04-environment-variables.md)
