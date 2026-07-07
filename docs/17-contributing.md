# Contributing Guide

[← Back to index](README.md)

## Development setup

1. Follow [Installation Guide](03-installation.md)
2. Create a feature branch (when using git)
3. Make changes in the appropriate app (`modenixos-server` or `modenixos-client`)

---

## Code conventions

### General

- **Minimize scope** — focused changes only
- **Match existing patterns** — module structure, naming, error handling
- **No over-engineering** — avoid unnecessary abstractions
- **Self-documenting code** — comments only for non-obvious logic

### Server

| Convention | Location |
|------------|----------|
| Module pattern | `route.ts` → `controller.ts` → `service.ts` → `validation.ts` |
| Async handlers | Wrap with `catchAsync` |
| Responses | Use `sendResponse` helper |
| Errors | Throw `AppError` with `http-status-codes` |
| Validation | Zod schemas in `*.validation.ts`, applied via `validateRequest` |
| Auth | `checkAuth(Role.…)` + `attachStoreId` for store routes |
| DB access | Prisma client from `app/lib/prisma.ts` |

### Client

| Convention | Location |
|------------|----------|
| Server Actions | `src/actions/` for mutations |
| Components | `components/modules/{feature}/` |
| UI primitives | `components/ui/` (shadcn) |
| Types | `src/types/` |
| API calls | Server Actions or `lib/` axios helpers with cookies |
| Route protection | Update `proxy.ts` and `authUtils.ts` together |

---

## Database changes

1. Edit schema in `modenixos-server/prisma/schema/`
2. Run `npm run db:migrate` with descriptive migration name
3. Commit migration SQL files
4. Update [Database docs](06-database.md) if models change

---

## Quality checks

### Server

```bash
cd modenixos-server
npm run lint
npm run typecheck
npm test
```

### Client

```bash
cd modenixos-client
pnpm lint
pnpm typecheck
```

---

## Pull request checklist

- [ ] Lint and typecheck pass
- [ ] Database migration included (if schema changed)
- [ ] Environment variables documented in [04-environment-variables.md](04-environment-variables.md)
- [ ] API changes documented in [08-api-documentation.md](08-api-documentation.md)
- [ ] No secrets committed
- [ ] Tested locally with both server and client running

---

## Documentation updates

When adding features, update the relevant doc in `docs/`:

| Change type | Update |
|-------------|--------|
| New API endpoint | `08-api-documentation.md` |
| New env var | `04-environment-variables.md` + `.env.example` |
| New model | `06-database.md` |
| Auth change | `07-authentication.md` |
| New limitation | `15-known-limitations.md` |

---

## Related documentation

- [Folder Structure](05-folder-structure.md)
- [Configuration](10-configuration.md)
