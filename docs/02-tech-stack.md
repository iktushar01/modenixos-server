# Tech Stack

[← Back to index](README.md)

## Overview

| Layer | Server (`modenixos-server`) | Client (`modenixos-client`) |
|-------|----------------------------|----------------------------|
| Runtime | Node.js (ES modules) | Node.js |
| Language | TypeScript 5.9 | TypeScript 5 |
| Framework | Express 5 | Next.js 15 (App Router), React 19 |
| Package manager | npm | pnpm 11.9 |

---

## Server

### Languages & runtime

- **TypeScript** — strict mode, ES2023 target
- **Node.js 20+** — required per README

### Frameworks & core libraries

| Library | Version | Purpose |
|---------|---------|---------|
| Express | 5.2 | HTTP server and routing |
| Prisma | 7.5 | ORM and migrations |
| `@prisma/adapter-pg` | 7.5 | PostgreSQL driver adapter |
| Zod | 4.3 | Request validation |
| Better Auth | 1.4 | OAuth, sessions, email OTP plugin |
| jsonwebtoken | 9.0 | Custom JWT access/refresh tokens |
| Helmet | 8.2 | Security headers |
| CORS | 2.8 | Cross-origin requests |
| express-rate-limit | 8.5 | Auth and chatbot rate limiting |
| cookie-parser | 1.4 | Cookie parsing |

### Database

| Component | Technology |
|-----------|------------|
| Database | PostgreSQL |
| ORM | Prisma 7 (multi-file schema in `prisma/schema/`) |
| Client output | `src/generated/prisma` |

### Authentication

| Component | Technology |
|-----------|------------|
| Primary | Better Auth (email/password, Google OAuth, email OTP) |
| API tokens | Custom JWT pair (`accessToken`, `refreshToken`) in HTTP-only cookies |
| Storefront customers | Separate JWT per store slug |

### File storage

| Component | Technology |
|-----------|------------|
| Upload handling | Multer (memory storage for processing) |
| Cloud storage | Cloudinary via `multer-storage-cloudinary` |
| Limits | 10 MB per file; images and PDFs only |

### Email

| Component | Technology |
|-----------|------------|
| Transport | Nodemailer |
| Templates | EJS (`src/app/templates/`) |
| Use cases | Email verification OTP, password reset OTP |

### Payment

| Provider | Use case | Library |
|----------|----------|---------|
| **Stripe** | Store subscription billing (Growth plan) | `stripe` 22.3 |
| **SSLCommerz** | Customer order payments + subscription billing (BDT) | `sslcommerz-lts` 1.2 |

### AI / Chatbot

| Component | Technology |
|-----------|------------|
| Provider | OpenRouter API |
| Pattern | RAG with embedding similarity over `ChatbotKnowledgeChunk` |
| Models | Configurable via env (default: Nemotron embed + LLM) |

### Testing & quality

| Tool | Purpose |
|------|---------|
| Vitest 4.1 | Unit/integration tests |
| Supertest 7.2 | HTTP endpoint testing |
| ESLint 9 | Linting (`eslint.config.mjs`) |
| TypeScript | `tsc --noEmit` type checking |

### Deployment tools (present in codebase)

| Tool | Status |
|------|--------|
| Vercel | `vercel.json` for server deployment |
| Railway | `process.env.PORT` referenced in `server.ts` |
| Docker | **Not implemented** |
| PM2 | **Not implemented** |
| Nginx | **Not implemented** |
| CI/CD | **Not implemented** in repository |

---

## Client

### Frameworks

| Library | Version | Purpose |
|---------|---------|---------|
| Next.js | 15.5 | App Router, SSR, Server Actions |
| React | 19.1 | UI |
| Tailwind CSS | 4 | Styling |
| shadcn/ui + Radix UI | — | Component library |
| next-themes | 0.4 | Light/dark/system theming |

### Data & forms

| Library | Purpose |
|---------|---------|
| TanStack React Query 5 | Client-side data fetching and caching |
| TanStack Form | Form state |
| React Hook Form | Form handling |
| Zod 4 | Client-side validation |
| Axios | HTTP client (server-side with cookie forwarding) |

### UI & interaction

| Library | Purpose |
|---------|---------|
| Framer Motion / Motion / GSAP | Animations |
| @dnd-kit | Drag-and-drop (catalog reordering) |
| Recharts | Analytics charts |
| Embla Carousel | Storefront carousels |
| Lucide React | Icons |
| Sonner | Toast notifications |
| Zustand | Client state |

### Auth (client-side)

| Mechanism | Purpose |
|-----------|---------|
| Edge middleware (`proxy.ts`) | Route protection, JWT verification, token refresh |
| `cookies-next` | Cookie access in Server Actions |
| `jsonwebtoken` | JWT verification in middleware (matches server secret) |
| `/api/auth/oauth/complete` | OAuth cookie handoff route |

---

## Related documentation

- [Installation](03-installation.md)
- [Environment Variables](04-environment-variables.md)
- [Configuration](10-configuration.md)
