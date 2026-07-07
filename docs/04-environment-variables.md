# Environment Variables

[← Back to index](README.md)

Complete reference for server and client environment variables. Values marked **Required** will cause server startup failure if missing (validated in `modenixos-server/src/config/env.ts`).

---

## Server — `.env.example`

The canonical example file is at `modenixos-server/.env.example`. Consolidated reference below.

### Core

| Variable | Required | Default | Purpose | Used in |
|----------|----------|---------|---------|---------|
| `PORT` | Yes | `5000` | HTTP server port | `server.ts`, `env.ts` |
| `NODE_ENV` | Yes | `development` | Environment mode | `env.ts`, cookie security, error responses |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string | Prisma (`prisma.config.ts`) |
| `APP_NAME` | Yes | — | Display name in emails, root route, chatbot | `env.ts`, `chatbot.config.ts` |
| `APP_UPLOAD_FOLDER` | Yes | — | Cloudinary folder prefix | `multer.config.ts` |

### URLs

| Variable | Required | Default | Purpose | Used in |
|----------|----------|---------|---------|---------|
| `BETTER_AUTH_URL` | Yes | — | Backend base URL for Better Auth | `auth.ts`, CORS, SSLCommerz callbacks |
| `FRONTEND_URL` | Yes | — | Frontend origin for CORS, redirects, Stripe | `app.ts`, `stripe.config.ts`, `sslcommerz.config.ts` |
| `BACKEND_URL` | No | Falls back to `BETTER_AUTH_URL` | Public payment callback URLs | `sslcommerz.config.ts` |

### Authentication secrets

| Variable | Required | Default | Purpose | Used in |
|----------|----------|---------|---------|---------|
| `BETTER_AUTH_SECRET` | Yes | — | Better Auth encryption secret | `auth.ts` |
| `ACCESS_TOKEN_SECRET` | Yes | — | JWT access token signing | `jwt.ts`, must match client |
| `REFRESH_TOKEN_SECRET` | Yes | — | JWT refresh token signing | `jwt.ts` |
| `ACCESS_TOKEN_EXPIRES_IN` | Yes | `1d` | Access token TTL (ms format) | `jwt.ts` |
| `REFRESH_TOKEN_EXPIRES_IN` | Yes | `7d` | Refresh token TTL | `jwt.ts` |
| `BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN` | Yes | `1d` | Better Auth session expiry | `auth.ts` |
| `BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE` | Yes | `1d` | Session refresh interval | `auth.ts` |

### Super Admin seed

| Variable | Required | Default | Purpose | Used in |
|----------|----------|---------|---------|---------|
| `SUPER_ADMIN_EMAIL` | Yes | — | Auto-seeded Super Admin email | `seed.ts` |
| `SUPER_ADMIN_PASSWORD` | Yes | — | Auto-seeded Super Admin password | `seed.ts` |

### Email (SMTP)

| Variable | Required | Default | Purpose | Used in |
|----------|----------|---------|---------|---------|
| `EMAIL_HOST` | Yes | — | SMTP host | `email.ts` |
| `EMAIL_PORT` | Yes | — | SMTP port | `email.ts` |
| `EMAIL_SECURE` | Yes | `false` | TLS (`true`/`false`) | `email.ts` |
| `EMAIL_USER` | Yes | — | SMTP username | `email.ts` |
| `EMAIL_PASSWORD` | Yes | — | SMTP password | `email.ts` |
| `EMAIL_FROM` | Yes | — | From address | `email.ts` |
| `EXPIRE_OTP_TIME` | Yes | `15m` | OTP expiry duration | `auth.ts` (Better Auth emailOTP plugin) |

### Google OAuth

| Variable | Required | Default | Purpose | Used in |
|----------|----------|---------|---------|---------|
| `GOOGLE_CLIENT_ID` | Yes* | — | Google OAuth client ID | `auth.ts` |
| `GOOGLE_CLIENT_SECRET` | Yes* | — | Google OAuth secret | `auth.ts` |
| `GOOGLE_CALLBACK_URL` | Yes* | — | Must be `{BETTER_AUTH_URL}/api/auth/callback/google` | `auth.ts` |

\*Required by env validation even if Google login is unused. Use placeholder values in dev or provide real credentials.

### Cloudinary

| Variable | Required | Default | Purpose | Used in |
|----------|----------|---------|---------|---------|
| `CLOUDINARY_CLOUD_NAME` | Yes | — | Cloud name | `cloudinary.config.ts` |
| `CLOUDINARY_API_KEY` | Yes | — | API key | `cloudinary.config.ts` |
| `CLOUDINARY_API_SECRET` | Yes | — | API secret | `cloudinary.config.ts` |

### Stripe (subscriptions)

| Variable | Required | Default | Purpose | Used in |
|----------|----------|---------|---------|---------|
| `STRIPE_SECRET_KEY` | No | — | Stripe API key; billing disabled if empty | `stripe.config.ts` |
| `STRIPE_PRICE_PRO_MONTHLY` | No | Auto-created | Growth plan Price ID | `stripe.config.ts` |
| `STRIPE_WEBHOOK_SECRET` | No | — | Webhook signature verification | `billing.controller.ts` |

### SSLCommerz (orders + BDT billing)

| Variable | Required | Default | Purpose | Used in |
|----------|----------|---------|---------|---------|
| `SSLC_STORE_ID` | No | — | Merchant store ID | `sslcommerz.config.ts` |
| `SSLC_STORE_PASSWORD` | No | — | Merchant password | `sslcommerz.config.ts` |
| `SSLC_IS_LIVE` | No | `false` | `true` = production gateway | `sslcommerz.config.ts` |
| `SSLC_BILLING_PRO_AMOUNT` | No | `2900` | Growth plan price in BDT | `sslcommerz.config.ts` |

### OpenRouter (chatbot)

| Variable | Required | Default | Purpose | Used in |
|----------|----------|---------|---------|---------|
| `OPENROUTER_API_KEY` | No | — | Enables chatbot when set | `chatbot.config.ts` |
| `OPENROUTER_BASE_URL` | No | `https://openrouter.ai/api/v1` | API base URL | `chatbot.config.ts` |
| `OPENROUTER_EMBEDDING_MODEL` | No | `nvidia/llama-nemotron-embed-vl-1b-v2:free` | Embedding model | `chatbot.config.ts` |
| `OPENROUTER_LLM_MODEL` | No | `nvidia/nemotron-3-super-120b-a12b:free` | Chat model | `chatbot.config.ts` |
| `CHATBOT_TOP_K` | No | `5` | RAG retrieval count | `chatbot.config.ts` |
| `CHATBOT_MIN_SIMILARITY` | No | `0.55` | Minimum cosine similarity | `chatbot.config.ts` |
| `CHATBOT_EMBEDDING_DIMENSION` | No | `2048` | Embedding vector size | `chatbot.config.ts` |
| `CHATBOT_RATE_LIMIT_WINDOW_MS` | No | `900000` (15 min) | Rate limit window | `chatbotRateLimiter.ts` |
| `CHATBOT_RATE_LIMIT_MAX` | No | `60` | Max requests per window | `chatbotRateLimiter.ts` |

### Runtime (set by host, not in `.env.example`)

| Variable | Purpose | Used in |
|----------|---------|---------|
| `PORT` | Overridden by Railway/hosting | `server.ts` |
| `VERCEL` | Skips `bootstrap()` listen when `1` | `server.ts` |

---

## Client — `.env.example`

File: `modenixos-client/.env.example`

| Variable | Required | Default | Purpose | Used in |
|----------|----------|---------|---------|---------|
| `NEXT_PUBLIC_APP_NAME` | No | `ModenixOS` | UI title | `lib/app-config.ts` |
| `NEXT_PUBLIC_API_BASE_URL` | Yes | `http://localhost:5000/api/v1` | Backend API base | Server Actions, API calls |
| `NEXT_PUBLIC_BASE_URL` | No | `http://localhost:3000` | Frontend URL | Future use / redirects |
| `ACCESS_TOKEN_SECRET` | Yes | — | JWT verification in middleware | `middlewareAuth.ts` — **must match server** |

---

## Example files

### Server (`modenixos-server/.env.example`)

```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/modenixos_db
APP_NAME=ModenixOS
APP_UPLOAD_FOLDER=modenixos
BETTER_AUTH_SECRET=your_better_auth_secret
BETTER_AUTH_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
ACCESS_TOKEN_EXPIRES_IN=1d
REFRESH_TOKEN_EXPIRES_IN=7d
BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN=1d
BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE=1d
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=change_me_in_production
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_app_password
EMAIL_FROM="Starter App <your_email@gmail.com>"
EXPIRE_OTP_TIME=15m
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/callback/google
CLOUDINARY_CLOUD_NAME=your_CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY=your_CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET=your_CLOUDINARY_API_SECRET
SSLC_STORE_ID=
SSLC_STORE_PASSWORD=
SSLC_IS_LIVE=false
BACKEND_URL=http://localhost:5000
SSLC_BILLING_PRO_AMOUNT=2900
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PRICE_PRO_MONTHLY=price_your_pro_monthly_price_id
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_EMBEDDING_MODEL=nvidia/llama-nemotron-embed-vl-1b-v2:free
OPENROUTER_LLM_MODEL=nvidia/nemotron-3-super-120b-a12b:free
CHATBOT_TOP_K=5
CHATBOT_MIN_SIMILARITY=0.55
CHATBOT_EMBEDDING_DIMENSION=2048
```

### Client (`modenixos-client/.env.example`)

```env
NEXT_PUBLIC_APP_NAME=ModenixOS
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_BASE_URL=http://localhost:3000
ACCESS_TOKEN_SECRET=your_access_token_secret
```

---

## Related documentation

- [Installation](03-installation.md)
- [Security](13-security.md)
- [Deployment](11-deployment.md)
