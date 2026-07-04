# Injentro Server

Express + Prisma backend for the full-stack starter. It handles authentication, user management, file uploads, email OTP flows, and role-based access control.

## Tech Stack

| Category | Technologies |
|----------|--------------|
| Runtime | Node.js (ES modules) |
| Framework | Express 5 |
| Language | TypeScript |
| Database | PostgreSQL + Prisma 7 |
| Auth | Better Auth + custom JWT access/refresh tokens |
| Validation | Zod 4 |
| Email | Nodemailer + EJS templates |
| File uploads | Multer + Cloudinary |
| Security | Helmet, CORS, rate limiting |
| Testing | Vitest + Supertest |

## Features

### Authentication (`/api/v1/auth`)

- Client registration with optional profile image upload
- Email/password login and logout
- JWT access and refresh token pair (HTTP-only cookies)
- Email verification via 6-digit OTP
- Forgot password and reset password (OTP-based)
- Change password (authenticated)
- Get and update profile (`/me`) with optional image upload
- Google OAuth with frontend code exchange
- Rate limiting on auth routes (100 requests / 15 min)

### User management (`/api/v1/users`)

- Create admin accounts (`SUPER_ADMIN` only)
- Supports `ADMIN` and `SUPER_ADMIN` roles

### Roles & profiles

| Role | Profile model | Description |
|------|---------------|-------------|
| `CLIENT` | `Client` | End-user with address, gender, contact info |
| `ADMIN` | `Admin` | Admin with name, contact, photo |
| `SUPER_ADMIN` | `Admin` | Full access including admin creation |

User statuses: `ACTIVE`, `INACTIVE`, `SUSPENDED`, `DELETED`.

### Infrastructure

- Health check endpoint with database connectivity probe
- Global error handler (Zod, Multer, Prisma, custom AppError)
- Auto-seed of first Super Admin on startup
- EJS email templates for OTP and Google OAuth redirect
- Cloudinary integration for image/PDF uploads (10 MB limit)

## Prerequisites

1. **Node.js 20+**
2. **PostgreSQL** (local or hosted)
3. **Cloudinary** account (for file uploads)
4. **SMTP credentials** (for OTP emails)
5. **Google OAuth credentials** (optional, for Google login)

## Local installation

### 1. Install dependencies

```bash
cd Injentro-server
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your local values. All variables below are validated at startup.

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: `5000`) |
| `NODE_ENV` | `development` or `production` |
| `DATABASE_URL` | PostgreSQL connection string |
| `APP_NAME` | Display name used in emails and root route |
| `APP_UPLOAD_FOLDER` | Cloudinary folder prefix |
| `BETTER_AUTH_SECRET` | Secret for Better Auth |
| `BETTER_AUTH_URL` | Backend base URL, e.g. `http://localhost:5000` |
| `FRONTEND_URL` | Frontend origin for CORS and OAuth, e.g. `http://localhost:3000` |
| `ACCESS_TOKEN_SECRET` | JWT access token secret (must match client) |
| `REFRESH_TOKEN_SECRET` | JWT refresh token secret |
| `ACCESS_TOKEN_EXPIRES_IN` | Access token TTL, e.g. `1d` |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token TTL, e.g. `7d` |
| `BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN` | Session expiry |
| `BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE` | Session refresh interval |
| `SUPER_ADMIN_EMAIL` | Email for auto-seeded Super Admin |
| `SUPER_ADMIN_PASSWORD` | Password for auto-seeded Super Admin |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE` | SMTP settings |
| `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM` | SMTP credentials |
| `EXPIRE_OTP_TIME` | OTP expiry, e.g. `15m` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth (optional) |
| `GOOGLE_CALLBACK_URL` | Must be `{BETTER_AUTH_URL}/api/auth/callback/google` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary credentials |
| `IMGBB_API_KEY` | Required by env validation (legacy; uploads use Cloudinary) |

### 3. Set up the database

Create a PostgreSQL database, then run migrations:

```bash
npm run db:migrate
```

This applies the Prisma schema and creates tables for users, sessions, clients, admins, and related models.

### 4. Run the server

```bash
npm run dev
```

The API starts at [http://localhost:5000](http://localhost:5000).

On first startup, a Super Admin is created automatically using `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` if none exists.

## Available scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Development server with hot reload |
| `start` | `npm run start` | Run without watch |
| `build` | `npm run build` | Generate Prisma client, compile TypeScript |
| `lint` | `npm run lint` | Run ESLint |
| `typecheck` | `npm run typecheck` | Run TypeScript check |
| `test` | `npm run test` | Run Vitest tests |
| `test:watch` | `npm run test:watch` | Run tests in watch mode |
| `db:migrate` | `npm run db:migrate` | Apply dev migrations |
| `db:migrate:deploy` | `npm run db:migrate:deploy` | Apply migrations in production |
| `db:studio` | `npm run db:studio` | Open Prisma Studio |

## API overview

### Base URLs

| Prefix | Purpose |
|--------|---------|
| `/` | Root health message |
| `/health` | Health check with DB status |
| `/api/auth/*` | Better Auth native handler (OAuth callbacks, etc.) |
| `/api/v1/auth/*` | Custom auth routes |
| `/api/v1/users/*` | User management |

### Auth endpoints (public)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/auth/register` | Register client (multipart: name, email, password, optional image) |
| `POST` | `/api/v1/auth/login` | Login with email and password |
| `POST` | `/api/v1/auth/refresh-token` | Refresh JWT using cookie |
| `POST` | `/api/v1/auth/verify-email` | Verify email with OTP |
| `POST` | `/api/v1/auth/forget-password` | Request password reset OTP |
| `POST` | `/api/v1/auth/reset-password` | Reset password with OTP |
| `GET` | `/api/v1/auth/login/google` | Start Google OAuth |
| `GET` | `/api/v1/auth/oauth/code` | Exchange OAuth code for tokens |

### Auth endpoints (protected)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/auth/me` | Get current user and profile |
| `PATCH` | `/api/v1/auth/me` | Update profile (optional image) |
| `POST` | `/api/v1/auth/change-password` | Change password |
| `POST` | `/api/v1/auth/logout` | Logout and clear cookies |

### User endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/users/create-admin` | `SUPER_ADMIN` | Create an admin account |

### Response format

**Success:**

```json
{
  "success": true,
  "message": "...",
  "data": {},
  "meta": {}
}
```

**Error:**

```json
{
  "success": false,
  "statusCode": 400,
  "message": "...",
  "errorSources": [{ "path": "...", "message": "..." }]
}
```

## Project structure

```
Injentro-server/
├── prisma/
│   ├── schema/              # Multi-file Prisma schema
│   │   ├── schema.prisma    # Generator + datasource
│   │   ├── auth.prisma      # User, Session, Account, Verification
│   │   ├── admin.prisma     # Admin profile
│   │   ├── client.prisma    # Client profile
│   │   └── enums.prisma     # Role, UserStatus, Gender
│   └── migrations/
├── src/
│   ├── server.ts            # Entry point + Super Admin seed
│   ├── app.ts               # Express app and route mounting
│   ├── config/              # Env, Cloudinary, Multer
│   ├── generated/prisma/    # Generated Prisma client
│   └── app/
│       ├── lib/             # Better Auth, Prisma client
│       ├── routes/          # Route index and health
│       ├── module/
│       │   ├── auth/        # Auth routes, controller, service
│       │   └── user/        # User routes, controller, service
│       ├── middleware/      # Auth, validation, error handling
│       ├── utils/           # Email, JWT, tokens, seed
│       └── templates/       # EJS email templates
├── tests/
├── .env.example
└── package.json
```

## Running with the client

1. Start this server on port **5000**.
2. Start **Injentro-client** on port **3000**.
3. Set the client `NEXT_PUBLIC_API_BASE_URL` to `http://localhost:5000/api/v1`.
4. Use the same `ACCESS_TOKEN_SECRET` on both apps.

Default Super Admin credentials come from your `.env` (`SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`). Change these before deploying to production.

## Production build

```bash
npm run build
npm start
```

Vercel deployment is supported via `vercel.json` (output: `dist/server.js`).

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Env validation error on start | Ensure every variable in `.env.example` is set in `.env` |
| Database connection failed | Check PostgreSQL is running and `DATABASE_URL` is correct |
| Migration errors | Run `npm run db:migrate` after creating the database |
| Google OAuth redirect mismatch | Set `GOOGLE_CALLBACK_URL` to `{BETTER_AUTH_URL}/api/auth/callback/google` |
| CORS errors from client | Set `FRONTEND_URL=http://localhost:3000` |
| OTP emails not sending | Verify SMTP credentials in `EMAIL_*` variables |
