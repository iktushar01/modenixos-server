# Folder Structure

[← Back to index](README.md)

This repository is the **modenixos-server** backend. The frontend lives in a separate **`modenixos-client`** GitHub repository.

---

## Server layout

```
modenixos-server/
├── prisma/
│   ├── schema/                  # Multi-file Prisma schema
│   │   ├── schema.prisma        # Generator + datasource
│   │   ├── enums.prisma         # All enums
│   │   ├── auth.prisma          # User, Session, Account, Verification
│   │   ├── admin.prisma         # Admin profile
│   │   ├── client.prisma        # Client profile
│   │   ├── store.prisma         # Store model
│   │   ├── store-member.prisma  # StoreMember, StoreInvitation
│   │   ├── catalog.prisma       # Category, Collection, Product
│   │   ├── order.prisma         # Order
│   │   ├── customer.prisma      # Customer, WishlistItem, Review, Coupon
│   │   ├── billing.prisma       # Subscription, PaymentMethod, Invoice
│   │   ├── payment.prisma       # Payment (order payments)
│   │   ├── commission.prisma    # PlatformSettings, PlatformEarning
│   │   └── chatbot.prisma       # ChatbotKnowledgeChunk
│   └── migrations/              # SQL migration history
├── prisma.config.ts             # Prisma 7 config (schema path, DATABASE_URL)
├── scripts/
│   ├── seed-demo.ts             # Demo store seed
│   ├── seed-chatbot.ts          # Chatbot knowledge seed
│   ├── copy-generated-prisma.js # Build helper
│   └── fix-imports.js           # ESM import fixer for dist/
├── src/
│   ├── server.ts                # Entry: listen, seed super admin, chatbot seed
│   ├── app.ts                   # Express app setup, route mounting
│   ├── config/
│   │   ├── env.ts               # Required env validation
│   │   ├── cloudinary.config.ts
│   │   ├── multer.config.ts     # File upload (Cloudinary + memory)
│   │   ├── planLimits.ts        # FREE / PRO / ENTERPRISE limits
│   │   ├── stripe.config.ts
│   │   ├── sslcommerz.config.ts
│   │   └── chatbot.config.ts
│   ├── generated/prisma/        # Generated Prisma client (do not edit)
│   └── app/
│       ├── lib/
│       │   ├── auth.ts          # Better Auth configuration
│       │   └── prisma.ts        # Prisma client singleton
│       ├── routes/
│       │   ├── index.ts         # /api/v1 route aggregator
│       │   ├── public.route.ts  # Public storefront + chatbot routes
│       │   └── health.route.ts  # /health
│       ├── module/              # Feature modules (route/controller/service/validation)
│       │   ├── auth/
│       │   ├── user/
│       │   ├── store/
│       │   ├── store-member/
│       │   ├── category/
│       │   ├── collection/
│       │   ├── product/
│       │   ├── order/
│       │   ├── customer/
│       │   ├── review/
│       │   ├── coupon/
│       │   ├── analytics/
│       │   ├── admin/
│       │   ├── billing/
│       │   ├── payment/
│       │   ├── commission/
│       │   ├── chatbot/
│       │   ├── storefront-customer/
│       │   └── wishlist/
│       ├── middleware/
│       │   ├── checkAuth.ts           # JWT + session auth
│       │   ├── optionalCheckAuth.ts   # Optional platform auth
│       │   ├── attachStoreId.ts       # Resolve store for CLIENT users
│       │   ├── attachStoreOwner.ts    # Owner-only (billing)
│       │   ├── resolvePublicStore.ts  # Public store by slug
│       │   ├── storefrontCustomerAuth.ts
│       │   ├── validateRequest.ts     # Zod validation middleware
│       │   ├── authRateLimiter.ts
│       │   ├── chatbotRateLimiter.ts
│       │   ├── globalErrorhandler.ts
│       │   └── notFound.ts
│       ├── utils/               # JWT, cookies, email, seed, plan enforcement
│       ├── templates/           # EJS email templates
│       ├── shared/              # catchAsync, sendResponse
│       └── errorHelpers/
├── tests/                       # Vitest tests
├── .env.example
├── vercel.json                  # Vercel serverless config
├── tsconfig.json
├── eslint.config.mjs
└── package.json
```

### Module pattern

Each feature module typically contains:

| File | Responsibility |
|------|----------------|
| `*.route.ts` | Express router, middleware chain, HTTP verbs |
| `*.controller.ts` | Request/response handling |
| `*.service.ts` | Business logic and Prisma queries |
| `*.validation.ts` | Zod schemas |

---

## Frontend (separate repository)

The Next.js client is **`modenixos-client`** on GitHub. See that repository's `docs/05-folder-structure.md`.

---

## Related documentation

- [Database](06-database.md)
- [API Documentation](08-api-documentation.md)
- [Configuration](10-configuration.md)
