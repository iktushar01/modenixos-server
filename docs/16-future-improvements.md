# Future Improvements

[← Back to index](README.md)

Suggested enhancements based on gaps identified in the codebase. **Not committed work** — for planning purposes only.

---

## High priority

| Improvement | Rationale |
|-------------|-----------|
| Enforce `StoreMemberRole` permissions | `VIEWER` read-only, `STAFF` order/catalog ops, `ADMIN` full except billing |
| Remove debug telemetry | Clean `fetch` calls in `chatbotRateLimiter.ts` and `globalErrorhandler.ts` |
| Add Docker Compose | PostgreSQL + server + client for consistent dev/prod |
| CI/CD pipeline | Lint, typecheck, test on PR |
| Expand test coverage | Auth, orders, payments, plan enforcement |

---

## Platform

| Improvement | Rationale |
|-------------|-----------|
| ENTERPRISE self-serve sales flow | Contact/sales workflow for Scale plan |
| Custom domain support | DNS verification + routing for ENTERPRISE |
| Multi-store per owner | Remove `ownerId` unique constraint if business requires |
| Audit log | Track admin actions, plan overrides, suspensions |
| Webhook notifications for store owners | Order placed, low stock alerts |

---

## Commerce

| Improvement | Rationale |
|-------------|-----------|
| First-class product variants table | Separate SKU/stock per variant |
| Refund workflow | Stripe/SSLCommerz refund integration |
| Shipping carrier integrations | Real-time rates vs static JSON config |
| Abandoned cart recovery | Email reminders |
| Export orders/customers | CSV download |

---

## Client / UX

| Improvement | Rationale |
|-------------|-----------|
| Dynamic Cloudinary config | Env-based `remotePatterns` instead of hardcoded hostname |
| i18n / multi-language storefront | Policy pages and UI strings |
| PWA / mobile app | Offline catalog browsing |
| Additional storefront themes | theme3+ in registry |

---

## Operations

| Improvement | Rationale |
|-------------|-----------|
| Structured logging (Pino/Winston) | Production observability |
| Error monitoring (Sentry) | Runtime error tracking |
| Database connection pooling docs | Serverless Prisma best practices |
| Automated database backups script | Supplement provider backups |
| Prettier + pre-commit hooks | Code consistency |

---

## Related documentation

- [Known Limitations](15-known-limitations.md)
- [Contributing](17-contributing.md)
