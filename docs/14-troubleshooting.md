# Troubleshooting

[← Back to index](README.md)

## Server

| Issue | Cause | Fix |
|-------|-------|-----|
| Server won't start: env validation error | Missing required env var | Set every variable in `requiredEnvVariables` (`config/env.ts`) |
| `EADDRINUSE` on port 5000 | Port in use | Stop other process or change `PORT` |
| Database connection failed | Wrong `DATABASE_URL` or PostgreSQL down | Verify connection string and DB status |
| Migration errors | Schema drift | Run `npm run db:migrate` (dev) or `db:migrate:deploy` (prod) |
| Prisma client not found | Client not generated | Run `npx prisma generate` or `npm run build` |
| Google OAuth warning on start | Invalid client ID/secret format | Set valid `GOOGLE_CLIENT_ID` ending in `.apps.googleusercontent.com` |
| OTP emails not sent | SMTP misconfiguration | Verify `EMAIL_*` variables; check spam folder |
| CORS errors from client | Origin mismatch | Set `FRONTEND_URL=http://localhost:3000` (dev) |
| Cloudinary upload fails | Invalid credentials or file type | Check `CLOUDINARY_*` vars; only images/PDF allowed |
| Stripe checkout unavailable | `STRIPE_SECRET_KEY` not set | Configure Stripe or use SSLCommerz provider |
| SSLCommerz payment fails | Sandbox credentials or wrong callback URL | Verify `SSLC_*` and `BACKEND_URL` |
| Chatbot returns errors | `OPENROUTER_API_KEY` missing or invalid | Set key or disable chatbot |
| 429 Too Many Requests | Rate limit hit | Wait 15 minutes or test in development (limits skipped) |

---

## Client

| Issue | Cause | Fix |
|-------|-------|-----|
| Middleware auth loop / redirect to login | JWT secret mismatch | Ensure `ACCESS_TOKEN_SECRET` matches server |
| API connection refused | Server not running | Start server on port 5000 |
| 401 on dashboard API calls | Expired tokens or no store | Re-login; complete onboarding if no store |
| Redirected to `/onboarding` | No store created | Create store via onboarding flow |
| Redirected to `/verify-email` | Email not verified | Complete OTP verification |
| Google login fails | OAuth misconfiguration | Check server Google env + `FRONTEND_URL` |
| Images not loading | Cloudinary domain not in `next.config.mjs` | Add your Cloudinary hostname to `remotePatterns` |
| `packages field missing` (pnpm) | Workspace config | Ensure `pnpm-workspace.yaml` exists with `packages: ['.']` |
| Build fails on types | TypeScript errors | Run `pnpm typecheck` and fix errors |

---

## Database

| Issue | Fix |
|-------|-----|
| Unique constraint violation (409) | Duplicate slug, email, or code — use unique values |
| Store not found on dashboard | User has no store; create via `POST /stores` |
| Prisma Studio won't connect | Check `DATABASE_URL` in `.env` |

---

## Payments

| Issue | Fix |
|-------|-----|
| Stripe webhook not firing | Register webhook URL in Stripe dashboard; verify `STRIPE_WEBHOOK_SECRET` |
| SSLCommerz redirect loop | Confirm callback URLs match `sslcommerz.config.ts` |
| Order stuck PENDING after payment | Check `/payment/ipn` logs; verify SSLCommerz validation |

---

## Diagnostic commands

```bash
# Server health
curl http://localhost:5000/health

# Check server env loaded
cd modenixos-server && npm run typecheck

# Check client build
cd modenixos-client && pnpm typecheck

# Open database GUI
cd modenixos-server && npm run db:studio

# Run server tests
cd modenixos-server && npm test
```

---

## Related documentation

- [Installation](03-installation.md)
- [Environment Variables](04-environment-variables.md)
- [Deployment](11-deployment.md)
