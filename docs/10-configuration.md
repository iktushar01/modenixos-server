# Configuration

[← Back to index](README.md)

## Server (`modenixos-server`)

### package.json scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `tsx watch src/server.ts` | Development with hot reload |
| `start` | `tsx src/server.ts` | Production start (no watch) |
| `build` | `prisma generate && tsc && copy/fix scripts` | Compile to `dist/` |
| `lint` | `eslint .` | ESLint |
| `typecheck` | `tsc --noEmit` | TypeScript check |
| `test` | `vitest run` | Run tests |
| `test:watch` | `vitest` | Watch mode |
| `db:migrate` | `prisma migrate dev` | Dev migrations |
| `db:migrate:deploy` | `prisma migrate deploy` | Production migrations |
| `db:studio` | `prisma studio` | Database GUI |
| `seed:demo` | `tsx scripts/seed-demo.ts` | Demo data |
| `chatbot:seed` | `tsx scripts/seed-chatbot.ts` | Chatbot knowledge |

### tsconfig.json

| Option | Value |
|--------|-------|
| `rootDir` | `./src` |
| `outDir` | `./dist` |
| `module` | ESNext |
| `moduleResolution` | bundler |
| `target` | ES2023 |
| `strict` | true |
| `noUncheckedIndexedAccess` | true |

### ESLint

- Config: `eslint.config.mjs` (flat config)
- Uses `@eslint/js`, `typescript-eslint`, `@typescript-eslint/eslint-plugin`

### Prettier

**Not configured** in the repository.

### Prisma

- Config: `prisma.config.ts`
- Schema path: `prisma/schema/` (multi-file)
- Migrations: `prisma/migrations/`
- Generated client: `src/generated/prisma`

### Express middleware order (`app.ts`)

1. Helmet
2. CORS (origins: `FRONTEND_URL`, `BETTER_AUTH_URL`, localhost)
3. `/api/auth` — Better Auth + rate limiter
4. `/api/v1/billing/webhook` — raw body for Stripe
5. `express.json()`, `cookieParser()`, `urlencoded`
6. Routes: `/`, `/health`, `/api/v1`
7. Global error handler, 404 handler

### Plan limits (`config/planLimits.ts`)

Defines `PLAN_LIMITS` and `PLAN_MRR` for FREE, PRO, ENTERPRISE.

---

## Client (`modenixos-client`)

### package.json scripts

| Script | Command |
|--------|---------|
| `dev` | `next dev` |
| `build` | `next build` |
| `start` | `next start` |
| `lint` | `next lint` |
| `typecheck` | `tsc --noEmit` |

### next.config.mjs

| Setting | Value |
|---------|-------|
| `images.remotePatterns` | Cloudinary (`res.cloudinary.com`) |
| `experimental.serverActions.bodySizeLimit` | 10mb |
| `experimental.proxyClientMaxBodySize` | 10mb |
| `experimental.staleTimes` | dynamic: 30s, static: 180s |

### tsconfig.json

- Path alias: `@/*` → `./src/*`
- Strict mode enabled
- Next.js plugin

### ESLint

- `eslint.config.mjs` with `eslint-config-next`

### Middleware (`middleware.ts` → `proxy.ts`)

| Setting | Value |
|---------|-------|
| Matcher | All paths except `api`, `_next/static`, `_next/image`, favicon, sitemap, robots, `.well-known` |
| Auth routes | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` |
| Client protected | `/dashboard/*` |
| Admin protected | `/admin/*` |
| Common protected | `/profile`, `/change-password`, `/onboarding`, `/invite/*` |
| Public | Storefront `/store/*`, landing `/`, demo |

### Docker

**Not implemented** — no `Dockerfile` or `docker-compose.yml` in repository.

### PM2

**Not implemented** — no `ecosystem.config.js`.

### Nginx

**Not implemented** — no nginx configuration in repository.

### CI/CD

**Not implemented** — no `.github/workflows` or other CI config in repository.

### Vercel (server only)

`modenixos-server/vercel.json`:
- Builds `dist/server.js` with `@vercel/node`
- Includes Prisma generated files and EJS templates

---

## Related documentation

- [Deployment](11-deployment.md)
- [Environment Variables](04-environment-variables.md)
- [Installation](03-installation.md)
