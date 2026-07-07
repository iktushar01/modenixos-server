# Known Limitations

[← Back to index](README.md)

Items verified against the current source code. These are **not** roadmap promises — they document gaps as of handover.

---

## Authorization & multi-user

| Limitation | Details |
|------------|---------|
| **Store member roles not enforced** | `StoreMemberRole` (`ADMIN`, `STAFF`, `VIEWER`) is stored in DB and set on `req.storeRole`, but route handlers do not check it. All members have equivalent API access to the owner (except billing). |
| **One store per owner** | `Store.ownerId` is `@unique` — a CLIENT can own only one store. |
| **ADMIN cannot create SUPER_ADMIN** | Enforced in `user.service.ts`, but only `SUPER_ADMIN` can access create-admin route. |

---

## Infrastructure

| Limitation | Details |
|------------|---------|
| **No Docker configuration** | No Dockerfile or compose file in repository. |
| **No PM2 / process manager config** | Manual process management required on VPS. |
| **No Nginx config** | Reverse proxy setup is manual. |
| **No CI/CD pipelines** | No GitHub Actions or similar in repository. |
| **No git repository at root** | Workspace may not have `.git` initialized. |
| **No Prettier config** | Code formatting not standardized via Prettier. |

---

## Features

| Limitation | Details |
|------------|---------|
| **ENTERPRISE plan** | Defined in schema and plan limits ($99 MRR in code) but no self-serve checkout — admin override only. |
| **Custom domain** | `customDomain: true` in ENTERPRISE limits but no DNS/domain routing implementation found. |
| **Product variants** | Rich variant schema in `details` JSON; fulfillment/stock per variant not fully isolated in DB columns. |
| **Inventory sync** | Stock decremented on order — verify edge cases for concurrent orders not explicitly tested. |
| **Email for storefront OTP** | Storefront customer OTP uses server email utilities — separate from Better Auth OTP flow. |
| **Chatbot** | Disabled without `OPENROUTER_API_KEY`; knowledge base is static seeded content. |
| **No multi-currency checkout** | Store has `currency` field; payment gateways are region-specific (BDT SSLCommerz, USD Stripe). |
| **No automated tests for business logic** | Only 2 health-check tests in `tests/app.test.ts`. |

---

## Client

| Limitation | Details |
|------------|---------|
| **Cloudinary hostname hardcoded** | `next.config.mjs` references specific Cloudinary cloud name path — must update for different Cloudinary accounts. |
| **Profile route mismatch** | `authUtils.ts` lists `/my-profile` but app uses `/profile`. |
| **Debug instrumentation** | `chatbotRateLimiter.ts` and `globalErrorhandler.ts` contain debug `fetch` calls to localhost — should be removed for production. |

---

## Documentation in legacy READMEs

Server README references `IMGBB_API_KEY` as required — **not present** in current `env.ts` validation. Uploads use Cloudinary only.

Server/client READMEs reference `Injentro-server` / `Injentro-client` — legacy names; actual directories are `modenixos-server` / `modenixos-client`.

---

## Related documentation

- [Future Improvements](16-future-improvements.md)
- [Security](13-security.md)
