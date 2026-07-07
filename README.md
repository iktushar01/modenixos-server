# ModenixOS Server

Express 5 + Prisma 7 REST API for ModenixOS — multi-tenant fashion brand SaaS backend.

## Documentation

**Full handover documentation:** [`docs/README.md`](docs/README.md)

| Quick links | |
|-------------|---|
| [Installation](docs/03-installation.md) | Setup, migrate, seed |
| [Environment variables](docs/04-environment-variables.md) | `.env` reference |
| [API documentation](docs/08-api-documentation.md) | All REST endpoints |
| [Database](docs/06-database.md) | Prisma schema |
| [Deployment](docs/11-deployment.md) | Production guide |

**Companion frontend:** separate GitHub repo `modenixos-client` — see its `docs/README.md`.

---

## Quick start

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run dev    # http://localhost:5000
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development with hot reload |
| `npm run build` | Prisma generate + TypeScript compile |
| `npm run start` | Production start |
| `npm run db:migrate` | Apply dev migrations |
| `npm run db:migrate:deploy` | Production migrations |
| `npm run seed:demo` | Demo store data |
| `npm test` | Vitest tests |

## API base

- Health: `GET /health`
- REST: `/api/v1/*`
- Better Auth: `/api/auth/*`

Default port: **5000**
