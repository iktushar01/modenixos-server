# API Documentation

[← Back to index](README.md)

## Conventions

### Base URLs

| Prefix | Purpose |
|--------|---------|
| `http://localhost:5000/` | Root message |
| `http://localhost:5000/health` | Health check |
| `http://localhost:5000/api/auth/*` | Better Auth native handler |
| `http://localhost:5000/api/v1/*` | REST API |

### Response format

**Success:**

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": {},
  "meta": {}
}
```

`meta` is included on paginated list endpoints.

**Error:**

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error summary",
  "errorSources": [{ "path": "fieldName", "message": "Detail" }]
}
```

In `development`, responses may include `error` and `stack`.

### Authentication header

Most protected routes use **HTTP-only cookies** (`accessToken`, `refreshToken`). Credentials must be sent with `credentials: "include"` from the browser.

---

## Health & root

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| GET | `/` | No | Returns `{APP_NAME} Server is running` |
| GET | `/health` | No | DB connectivity check |

**GET /health response:**

```json
{
  "success": true,
  "message": "Service is healthy",
  "data": { "status": "ok", "database": "connected" }
}
```

---

## Auth — `/api/v1/auth`

### POST `/register`

| | |
|--|--|
| **Auth** | No (rate limited) |
| **Content-Type** | `multipart/form-data` |
| **Body** | `name` (string), `email` (string), `password` (string 6–20), `image` (file, optional) |
| **Validation** | `registerClientZodSchema` |
| **Response** | User created; email verification required |

### POST `/login`

| | |
|--|--|
| **Auth** | No (rate limited) |
| **Body** | `{ "email": "string", "password": "string" }` |
| **Response** | Sets `accessToken`, `refreshToken` cookies |

### POST `/refresh-token`

| | |
|--|--|
| **Auth** | `refreshToken` cookie |
| **Response** | New token pair |

### POST `/verify-email`

| | |
|--|--|
| **Body** | `{ "email": "string", "otp": "string" }` |
| **Validation** | OTP 4–10 chars |

### POST `/forget-password`

| | |
|--|--|
| **Body** | `{ "email": "string" }` |
| **Response** | Sends OTP email |

### POST `/reset-password`

| | |
|--|--|
| **Body** | `{ "email", "otp", "newPassword" }` |

### POST `/change-password`

| | |
|--|--|
| **Auth** | All platform roles |
| **Body** | `{ "currentPassword", "newPassword" }` |

### GET `/me` · PATCH `/me` · POST `/logout`

| Method | Auth | Notes |
|--------|------|-------|
| GET `/me` | Yes | Current user + profile |
| PATCH `/me` | Yes | Multipart profile update |
| POST `/logout` | Yes | Clears cookies |

**PATCH /me body fields (optional, at least one required):** `name`, `profilePhoto`, `contactNumber`, `address`, `gender`

### Google OAuth

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/login/google` | Initiate Google OAuth |
| GET | `/google/success` | OAuth success handler |
| GET | `/oauth/code` | Exchange code for tokens |
| GET | `/oauth/error` | OAuth error handler |

---

## Users — `/api/v1/users`

### POST `/create-admin`

| | |
|--|--|
| **Auth** | `SUPER_ADMIN` |
| **Body** | `{ "password": "string", "role": "ADMIN" \| "SUPER_ADMIN", "admin": { "name", "email", "contactNumber?", "profilePhoto?" } }` |

---

## Stores — `/api/v1/stores`

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| POST | `/` | CLIENT | Create store |
| GET | `/me` | CLIENT | Get owner's/member's store |
| PATCH | `/:id` | CLIENT | Update store (multipart: logo, logoDark, banner, heroSlides) |

**POST / body:** `{ brandName, slug, country, currency?, description? }`

**PATCH /:id body:** `brandName`, `slug`, `country`, `currency`, `description`, `isPublished`, `theme` (JSON), `shipping` (JSON), `heroSlidesMeta` (JSON array)

### Store members — `/api/v1/stores`

| Method | URL | Auth | Body |
|--------|-----|------|------|
| GET | `/me/members` | CLIENT | — |
| POST | `/me/members` | CLIENT | `{ email, role: "ADMIN"\|"STAFF"\|"VIEWER" }` |
| DELETE | `/me/members/:memberId` | CLIENT | — |
| DELETE | `/me/invitations/:invitationId` | CLIENT | — |
| POST | `/invitations/:token/accept` | CLIENT | — |

---

## Catalog — `/api/v1/categories`, `/collections`, `/products`

**Auth:** `CLIENT` + `attachStoreId` on all routes.

### Common CRUD pattern

| Method | Path | Notes |
|--------|------|-------|
| POST | `/` | Create (multipart image for category/collection; up to 10 images for product) |
| GET | `/` | List with pagination/filters |
| GET | `/:id` | Get one |
| PATCH | `/:id` | Update |
| DELETE | `/:id` | Delete |
| PATCH | `/reorder` | Reorder by ID array |

**Reorder bodies:**

- Categories: `{ categoryIds: uuid[] }`
- Collections: `{ collectionIds: uuid[] }`
- Products: `{ productIds: uuid[] }`

### Product create body (key fields)

`name`, `price`, `description?`, `discountPrice?`, `categoryId?`, `collectionId?`, `stock?`, `sku?`, `images?`, `sizes?`, `colors?`, `tags?`, `details?` (JSON), `status?`

Plan enforcement: FREE plan limited to 50 products (`assertProductLimit`).

---

## Orders — `/api/v1/orders`

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| GET | `/stats` | CLIENT + store | Order statistics |
| GET | `/` | CLIENT + store | List orders |
| GET | `/:id` | CLIENT + store | Order detail |
| PATCH | `/:id/status` | CLIENT + store | Update status |

**PATCH /:id/status body:**

```json
{
  "status": "PENDING|CONFIRMED|PACKED|SHIPPED|DELIVERED|CANCELLED",
  "trackingNumber": "string|null",
  "trackingCarrier": "string|null"
}
```

---

## Customers — `/api/v1/customers`

| Method | URL | Auth |
|--------|-----|------|
| GET | `/` | CLIENT + store |
| POST | `/` | CLIENT + store |
| GET | `/:id` | CLIENT + store |
| PATCH | `/:id` | CLIENT + store |
| DELETE | `/:id` | CLIENT + store |

---

## Reviews — `/api/v1/reviews`

| Method | URL | Auth | Body |
|--------|-----|------|------|
| GET | `/` | CLIENT + store | — |
| PATCH | `/:id` | CLIENT + store | `{ status?, reply? }` |
| DELETE | `/:id` | CLIENT + store | — |

---

## Coupons — `/api/v1/coupons`

| Method | URL | Auth | Notes |
|--------|-----|------|-------|
| POST | `/` | CLIENT + store | Requires PRO+ plan |
| GET | `/` | CLIENT + store | |
| PATCH | `/:id` | CLIENT + store | |
| DELETE | `/:id` | CLIENT + store | |

**Create body:** `{ code, type: "PERCENT"|"FIXED", value, minOrder?, usageLimit?, expiresAt?, isActive? }`

---

## Analytics — `/api/v1/analytics`

| Method | URL | Auth | Notes |
|--------|-----|------|-------|
| GET | `/overview` | CLIENT + store | |
| GET | `/charts` | CLIENT + store | Advanced charts require PRO+ plan |

---

## Admin — `/api/v1/admin`

**Auth:** `ADMIN` or `SUPER_ADMIN`

| Method | URL | Body | Description |
|--------|-----|------|-------------|
| GET | `/stores` | — | List all stores |
| PATCH | `/stores/:id/suspend` | `{ isSuspended: boolean }` | Suspend/unsuspend |
| GET | `/users` | — | List users |
| GET | `/analytics` | — | Platform analytics |
| GET | `/subscriptions` | — | All subscriptions |
| GET | `/subscriptions/:storeId` | — | Store subscription |
| PATCH | `/stores/:id/plan` | `{ plan: "FREE"\|"PRO"\|"ENTERPRISE" }` | Override plan |
| GET | `/billing/analytics` | — | Billing metrics |
| GET | `/billing/failed-payments` | — | Failed payment list |
| GET | `/commission/settings` | — | Commission config |
| PATCH | `/commission/settings` | See below | Update commission |
| GET | `/commission/earnings` | — | Earnings list |
| GET | `/commission/analytics` | — | Commission analytics |

**PATCH /commission/settings body (all optional):**

`isEnabled`, `commissionType`, `commissionValue`, `commissionBase`, `triggerStatus`

---

## Billing — `/api/v1/billing`

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| GET | `/plans` | No | Available subscription plans |
| GET | `/overview` | CLIENT + owner | Subscription overview |
| POST | `/checkout` | CLIENT + owner | Start checkout |
| POST | `/portal` | CLIENT + owner | Stripe customer portal |
| POST | `/cancel` | CLIENT + owner | Cancel subscription |
| POST/GET | `/ssl/success`, `/ssl/fail`, `/ssl/cancel`, `/ssl/ipn` | No | SSLCommerz billing callbacks |

**POST /checkout body:** `{ plan: "PRO", provider?: "STRIPE" | "SSLCOMMERZ" }`

### Stripe webhook

| Method | URL | Auth | Notes |
|--------|-----|------|-------|
| POST | `/api/v1/billing/webhook` | Stripe signature | Raw JSON body |

---

## Payment — `/api/v1/payment`

SSLCommerz order payment callbacks (not subscription):

| Method | URL | Description |
|--------|-----|-------------|
| POST/GET | `/success` | Payment success |
| POST/GET | `/fail` | Payment failed |
| POST/GET | `/cancel` | Payment cancelled |
| POST | `/ipn` | Instant Payment Notification |

---

## Public — `/api/v1/public`

### Chatbot

| Method | URL | Auth | Body |
|--------|-----|------|------|
| GET | `/chat/config` | No | — |
| POST | `/chat` | No (rate limited) | `{ message, sessionId?, history? }` |

### Store — `/api/v1/public/stores/:slug`

Middleware: `optionalCheckAuth` → `resolvePublicStore` (unpublished stores visible to owner for preview).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Store public data |
| GET | `/categories` | No | Categories (paginated) |
| GET | `/collections` | No | Collections |
| GET | `/reviews` | No | Approved public reviews |
| GET | `/products` | No | Products (paginated, filterable) |
| GET | `/products/:id` | No | Product detail |
| POST | `/orders` | No | Create order |
| GET | `/orders/track` | No | Query: `orderNumber`, `email` |
| GET | `/orders/me` | Storefront customer | My orders |
| GET | `/orders/:orderNumber` | Storefront customer | Order detail |
| POST | `/reviews` | No | Submit review (pending moderation) |
| POST | `/coupons/validate` | No | `{ code, subtotal }` |
| POST | `/customers/register` | No | Storefront registration |
| POST | `/customers/login` | No | Password login |
| POST | `/customers/otp/send` | No | OTP send |
| POST | `/customers/otp/verify` | No | OTP verify |
| POST | `/customers/logout` | No | Clear customer cookie |
| GET | `/customers/me` | Optional customer | Profile |
| GET | `/wishlist` | Storefront customer | List wishlist |
| POST | `/wishlist` | Storefront customer | `{ productId }` |
| DELETE | `/wishlist/:productId` | Storefront customer | Remove item |
| GET | `/wishlist/:productId` | Storefront customer | Check if in wishlist |

### Public payment

| Method | Path | Body |
|--------|------|------|
| POST | `/payment/create` | Order payload + `paymentMethod: "SSLCOMMERZ"` → returns gateway URL |

**POST /orders body:** Same as `createOrderZodSchema` — `items[]`, `customerName`, `customerEmail`, `shippingAddress`, totals, `couponCode?`, `paymentMethod?` (default `COD`)

---

## Better Auth — `/api/auth/*`

Handled by Better Auth (`toNodeHandler`). Includes:

- Email/password sign-up and sign-in
- Google OAuth callback at `/api/auth/callback/google`
- Session management
- Email OTP plugin endpoints

Refer to [Better Auth documentation](https://www.better-auth.com/docs) for native endpoint details. Custom app auth uses `/api/v1/auth/*`.

---

## Common error codes

| Status | Cause |
|--------|-------|
| 400 | Zod validation failure, bad request |
| 401 | Missing/invalid token, suspended user |
| 403 | Wrong role, plan limit, suspended store |
| 404 | Resource not found, no store |
| 409 | Prisma unique constraint (duplicate) |
| 429 | Rate limit exceeded |
| 500 | Unhandled server error |
| 503 | Stripe not configured |

---

## Related documentation

- [Authentication](07-authentication.md)
- [Business Logic](09-business-logic.md)
- [Environment Variables](04-environment-variables.md)
