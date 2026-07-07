# ModenixOS Server — Documentation

Express 5 + Prisma 7 REST API for the ModenixOS platform.

**Companion app:** `modenixos-client` (separate GitHub repository) — frontend docs in that repo's `docs/` folder.

---

## Quick start

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run dev    # http://localhost:5000
```

---

## Documentation index

| # | Document | Description |
|---|----------|-------------|
| 1 | [Project Overview](01-project-overview.md) | Purpose, API features, roles, architecture |
| 2 | [Tech Stack](02-tech-stack.md) | Dependencies and integrations |
| 3 | [Installation Guide](03-installation.md) | Setup, migration, seed, production build |
| 4 | [Environment Variables](04-environment-variables.md) | Complete `.env` reference |
| 5 | [Folder Structure](05-folder-structure.md) | Source tree and module pattern |
| 6 | [Database](06-database.md) | Prisma models, ERD, enums, migrations |
| 7 | [Authentication](07-authentication.md) | JWT, Better Auth, storefront customers |
| 8 | [API Documentation](08-api-documentation.md) | Every REST endpoint |
| 9 | [Business Logic](09-business-logic.md) | Services, billing, commission, chatbot |
| 10 | [Configuration](10-configuration.md) | Scripts, tsconfig, ESLint, middleware |
| 11 | [Deployment Guide](11-deployment.md) | Vercel, Railway, VPS |
| 12 | [Backup & Recovery](12-backup-recovery.md) | PostgreSQL and Cloudinary |
| 13 | [Security](13-security.md) | Controls and recommendations |
| 14 | [Troubleshooting](14-troubleshooting.md) | Common issues |
| 15 | [Known Limitations](15-known-limitations.md) | Documented gaps |
| 16 | [Future Improvements](16-future-improvements.md) | Suggested enhancements |
| 17 | [Contributing](17-contributing.md) | Server dev conventions |
| 18 | [Changelog](18-changelog.md) | Migration timeline |

---

## API base URLs

| Prefix | Purpose |
|--------|---------|
| `/health` | Health check |
| `/api/auth/*` | Better Auth handler |
| `/api/v1/*` | REST API |

Default port: **5000**
