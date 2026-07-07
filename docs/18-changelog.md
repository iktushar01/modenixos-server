# Changelog

[← Back to index](README.md)

## Git history

**No git repository** was detected at the workspace root during documentation generation. Commit-level changelog is unavailable.

Below is a **migration-based timeline** derived from `modenixos-server/prisma/migrations/`, which reflects schema evolution.

---

## Schema migration timeline

| Date (migration prefix) | Migration | Changes |
|-------------------------|-----------|---------|
| 2026-06-12 | `20260612094009_ini` | Initial database schema (users, auth tables) |
| 2026-07-04 | `20260704110549_add_modenixos_models` | Core ModenixOS models: stores, catalog, orders |
| 2026-07-05 | `20260705092911_add_product_details_wishlist` | Product `details` JSON, wishlist |
| 2026-07-05 | `20260705100000_add_order_tracking_fields` | `trackingNumber`, `trackingCarrier` on orders |
| 2026-07-05 | `20260705143000_add_category_parent` | Hierarchical categories (`parentId`) |
| 2026-07-05 | `20260705220000_add_store_members` | Store members and invitations |
| 2026-07-06 | `20260706090000_add_billing` | Subscriptions, invoices, payment methods |
| 2026-07-06 | `20260706100000_add_payments` | Order payments (SSLCommerz) |
| 2026-07-06 | `20260706110000_billing_ssl_provider` | SSLCommerz as billing provider |
| 2026-07-06 | `20260706120000_add_product_sort_order` | Product `sortOrder` |
| 2026-07-06 | `20260706130000_add_store_logo_dark` | Store `logoDark` field |
| 2026-07-06 | `20260706140000_add_category_collection_sort_order` | Category/collection `sortOrder` |
| 2026-07-06 | `20260706163000_add_chatbot_knowledge` | Chatbot RAG knowledge chunks |
| 2026-07-06 | `20260706170000_add_platform_commission` | Platform commission settings and earnings |

---

## Package versions (current)

| Package | Server | Client |
|---------|--------|--------|
| Version | 1.0.0 | 0.1.0 |
| Node framework | Express 5.2 | Next.js 15.5 |
| ORM | Prisma 7.5 | — |
| React | — | 19.1 |
| TypeScript | 5.9 | 5.x |

---

## Documentation changelog

| Date | Event |
|------|-------|
| 2026-07-07 | Initial client handover documentation generated |

---

## Related documentation

- [Database](06-database.md)
- [Project Overview](01-project-overview.md)
