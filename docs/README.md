# NovaTech Store — Documentation

This directory contains documentation for the NovaTech Store hosted storefront platform, whose first release supports separate electronics stores for the Kenyan market.

## Project Overview

NovaTech Store is a **monorepo** managed with **npm workspaces**, containing:

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Backend**: Prisma ORM 5, PostgreSQL (Neon), Node.js

The platform enables customers to discover published stores at `/stores`, then browse, search, compare, and purchase genuine electronics (phones, laptops, tablets, and accessories) inside the selected store with warranty and fast delivery across all Kenyan counties. Stores keep separate catalogs, carts, accounts, and orders.

## Recent Changes

The latest implementation updates include:

- Added public company and customer-service pages for About, Blog, FAQs, Warranty, and Return Policy, linked through the footer's dynamic Customer Service and Quick Links sections.
- Added direct `tel:` and `mailto:` links to the contact information shown on the home page.
- Replaced the header's hardcoded logo with the NovaTech icon served through Next.js `Image`.
- Added local product image assets and a shared `getProductImage` resolver, with fallback handling across product listings, product details, recommendations, wishlist, inventory, and admin product views.
- Added `/admin/dashboard` as the canonical dashboard route; `/admin` now redirects to it, and the support tickets link uses `/admin/support`.
- Improved select controls for light and dark themes and disabled the development indicator overlay.

### Production-readiness implementation

The current implementation also includes the following production hardening work:

- Replaced mock search and compare data with live, database-backed product queries.
- Replaced the mock admin datasets for customers, coupons, reviews, deliveries, messages, security, and products with API-backed screens.
- Added coupon creation, activation/deactivation, deletion, review moderation, delivery status updates, support replies, and product price/stock editing.
- Added Prisma migration history under `backend/prisma/migrations/`, including the initial schema and webhook receipt support.
- Added indexes and constraints for payment references, order idempotency keys, review moderation, login events, and distributed rate-limit buckets.
- Replaced process-local rate limiting with PostgreSQL-backed rate-limit buckets for multi-instance deployments.
- Added checkout order idempotency, payment request reuse, and webhook receipt deduplication for Stripe and M-Pesa flows.
- Added admin audit logging for order status, product, coupon, and review changes.
- Added login event recording for successful and failed credential authentication attempts.
- Separated development seed data from production setup. Development seeding requires `SEED_ADMIN_PASSWORD`; production admin initialization uses `npm --workspace backend run db:init-admin` with explicit `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` values.
- Added Playwright browser tests, Ubuntu CI checks, staging health checks, and database backup/restore verification scripts.
- Strengthened production environment validation for HTTPS app URLs, `AUTH_SECRET`, payment providers, R2 storage, and transactional email.

### Latest storefront and account updates

The latest UI implementation updates include:

- Added developer-managed client configuration for branding, contact details, navigation, SEO, homepage content, commerce defaults, feature flags, and reusable theme presets.
- Replaced hardcoded theme values with preset-driven light/dark CSS variables and added a flash-free theme preference initialization path.
- Improved responsive behavior across the header, mobile navigation, footer, homepage sections, floating actions, product details, and search overlay for small and large screens.
- Added accessibility refinements including clearer control labels, keyboard-friendly interactions, focus states, live toast notifications, and improved semantic status messaging.
- Added account loading states and corrected the account middleware guard so authenticated account pages resolve consistently.
- Added profile image upload support in account settings, including storage-key generation, supported image formats, a 5 MB limit, and saved light/dark theme preferences.
- Refreshed the branded splash screen with a responsive gradient wordmark, animated progress treatment, and faster loading feedback.
- Added public email verification and password reset flows, plus searchable public legal pages for privacy, cookies, and terms.
- Added SEO metadata and image-host preconnect configuration, and improved navbar text truncation and shared notification behavior.
- Added the shopper `/stores` directory, published-store filtering, featured-product context, per-store host links, and a browse-all escape hatch.
- Preserved the shared homepage structure for every store while resolving branding, homepage content, contact details, and map links from the active `StoreContext`.
- Added authenticated preferred-store persistence through `User.preferredStoreId`, with the `novatech-preferred-store` cookie as a returning-browser fallback. This preference is not an authorization mechanism.
- Added local `{store-slug}.localhost` resolution. Production subdomain links and DNS/SSL still require deployment configuration and verification.

## Production verification

The following checks are available from the repository root:

```bash
npm run check:env
npm run db:deploy
npm --workspace backend run build
npm --workspace frontend exec tsc -- --noEmit --incremental false
npm test
npm run build
npm run test:e2e
npm run check:staging
npm run check:backup
```

Required variables for the external checks are:

- `STAGING_URL` for `npm run check:staging`.
- `BACKUP_DATABASE_URL` and `RESTORE_DATABASE_URL` for `npm run check:backup`.
- Provider sandbox credentials and `E2E_PAYMENT_PROVIDER` for payment E2E coverage.

The Playwright tests are configured in [`playwright.config.ts`](../playwright.config.ts), the CI workflow is in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml), and browser tests are in [`tests/e2e`](../tests/e2e).

## Current launch status

The application should not be marked production-ready until the external staging gates pass. Code-level checks currently pass, but launch configuration remains intentionally incomplete until the following are verified:

- Staging database migration deployment and health checks.
- Browser checkout and payment sandbox workflows.
- Stripe/M-Pesa webhook verification against provider sandboxes.
- PostgreSQL backup and restore verification.
- Linux production build and deployment smoke test.
- Dependency vulnerability remediation or documented risk acceptance.
- Final production credentials, seeded credential rotation, monitoring, and alerting.

Credentials are intentionally not documented here and must be configured only after the implementation and staging gates pass.

## Page links

Start the local server with `npm run dev`. The development server uses `http://localhost:3000`; the production base URL is `https://novatechstore.co.ke`.

The tables below list every UI page implemented under `frontend/src/app`. `Signed in` pages redirect unauthenticated visitors to sign-in. Legacy `/admin` pages use `ADMIN` or `SUPERADMIN`; merchant workspace pages under `/manage` use the resolved store membership boundary.

Store discovery is separate from storefront commerce: `/stores` helps a shopper choose a store, while the store's host handles that store's catalog, cart, account, checkout, and orders.

### Storefront

| Page | Access | Development | Production |
|---|---|---|---|
| Store directory | Public | [Open](http://localhost:3000/stores) | [Open](https://novatechstore.co.ke/stores) |
| Home | Public | [Open](http://localhost:3000/) | [Open](https://novatechstore.co.ke/) |
| Products | Public | [Open](http://localhost:3000/products) | [Open](https://novatechstore.co.ke/products) |
| Product detail | Public; dynamic | `http://localhost:3000/products/{product-slug}` | `https://novatechstore.co.ke/products/{product-slug}` |
| Category landing | Public; dynamic | `http://localhost:3000/category/{category-slug}` | `https://novatechstore.co.ke/category/{category-slug}` |
| Phones category | Public | [Open](http://localhost:3000/category/phones) | [Open](https://novatechstore.co.ke/category/phones) |
| Laptops category | Public | [Open](http://localhost:3000/category/laptops) | [Open](https://novatechstore.co.ke/category/laptops) |
| Tablets category | Public | [Open](http://localhost:3000/category/tablets) | [Open](https://novatechstore.co.ke/category/tablets) |
| Accessories category | Public | [Open](http://localhost:3000/category/accessories) | [Open](https://novatechstore.co.ke/category/accessories) |
| Deals | Public | [Open](http://localhost:3000/deals) | [Open](https://novatechstore.co.ke/deals) |
| Compare products | Public | [Open](http://localhost:3000/compare) | [Open](https://novatechstore.co.ke/compare) |
| Contact | Public | [Open](http://localhost:3000/contact) | [Open](https://novatechstore.co.ke/contact) |
| About | Public | [Open](http://localhost:3000/about) | [Open](https://novatechstore.co.ke/about) |
| Blog | Public | [Open](http://localhost:3000/blog) | [Open](https://novatechstore.co.ke/blog) |
| FAQs | Public | [Open](http://localhost:3000/faqs) | [Open](https://novatechstore.co.ke/faqs) |
| Return policy | Public | [Open](http://localhost:3000/return-policy) | [Open](https://novatechstore.co.ke/return-policy) |
| Warranty | Public | [Open](http://localhost:3000/warranty) | [Open](https://novatechstore.co.ke/warranty) |
| Cart | Signed in | [Open](http://localhost:3000/cart) | [Open](https://novatechstore.co.ke/cart) |
| Checkout | Signed in | [Open](http://localhost:3000/checkout) | [Open](https://novatechstore.co.ke/checkout) |

### Authentication

| Page | Access | Development | Production |
|---|---|---|---|
| Sign in | Public | [Open](http://localhost:3000/auth/signin) | [Open](https://novatechstore.co.ke/auth/signin) |
| Sign up | Public | [Open](http://localhost:3000/auth/signup) | [Open](https://novatechstore.co.ke/auth/signup) |
| Forgot password | Public | [Open](http://localhost:3000/auth/forgot-password) | [Open](https://novatechstore.co.ke/auth/forgot-password) |
| Reset password | Public; token required | [Open](http://localhost:3000/auth/reset-password) | [Open](https://novatechstore.co.ke/auth/reset-password) |
| Verify email | Public; verification code required | [Open](http://localhost:3000/auth/verify-email) | [Open](https://novatechstore.co.ke/auth/verify-email) |

### Legal and policy pages

| Page | Access | Development | Production |
|---|---|---|---|
| Privacy policy | Public | [Open](http://localhost:3000/privacy-policy) | [Open](https://novatechstore.co.ke/privacy-policy) |
| Cookie policy | Public | [Open](http://localhost:3000/cookie-policy) | [Open](https://novatechstore.co.ke/cookie-policy) |
| Terms and conditions | Public | [Open](http://localhost:3000/terms) | [Open](https://novatechstore.co.ke/terms) |

### Customer account

| Page | Access | Development | Production |
|---|---|---|---|
| Account overview | Signed in | [Open](http://localhost:3000/account) | [Open](https://novatechstore.co.ke/account) |
| Orders | Signed in | [Open](http://localhost:3000/account/orders) | [Open](https://novatechstore.co.ke/account/orders) |
| Order detail | Signed in; dynamic | `http://localhost:3000/account/orders/{order-id}` | `https://novatechstore.co.ke/account/orders/{order-id}` |
| Order tracking | Signed in; dynamic | `http://localhost:3000/account/orders/{order-id}/track` | `https://novatechstore.co.ke/account/orders/{order-id}/track` |
| Addresses | Signed in | [Open](http://localhost:3000/account/addresses) | [Open](https://novatechstore.co.ke/account/addresses) |
| Wishlist | Signed in | [Open](http://localhost:3000/account/wishlist) | [Open](https://novatechstore.co.ke/account/wishlist) |
| Notifications | Signed in | [Open](http://localhost:3000/account/notifications) | [Open](https://novatechstore.co.ke/account/notifications) |
| Account settings | Signed in | [Open](http://localhost:3000/account/settings) | [Open](https://novatechstore.co.ke/account/settings) |

### Admin console

| Page | Access | Development | Production |
|---|---|---|---|
| Admin root (redirects to dashboard) | Admin | [Open](http://localhost:3000/admin) | [Open](https://novatechstore.co.ke/admin) |
| Dashboard | Admin | [Open](http://localhost:3000/admin/dashboard) | [Open](https://novatechstore.co.ke/admin/dashboard) |
| Analytics | Admin | [Open](http://localhost:3000/admin/analytics) | [Open](https://novatechstore.co.ke/admin/analytics) |
| Products | Admin | [Open](http://localhost:3000/admin/products) | [Open](https://novatechstore.co.ke/admin/products) |
| Orders | Admin | [Open](http://localhost:3000/admin/orders) | [Open](https://novatechstore.co.ke/admin/orders) |
| Customers | Admin | [Open](http://localhost:3000/admin/customers) | [Open](https://novatechstore.co.ke/admin/customers) |
| Reviews | Admin | [Open](http://localhost:3000/admin/reviews) | [Open](https://novatechstore.co.ke/admin/reviews) |
| Coupons | Admin | [Open](http://localhost:3000/admin/coupons) | [Open](https://novatechstore.co.ke/admin/coupons) |
| Inventory | Admin | [Open](http://localhost:3000/admin/inventory) | [Open](https://novatechstore.co.ke/admin/inventory) |
| Deliveries | Admin | [Open](http://localhost:3000/admin/deliveries) | [Open](https://novatechstore.co.ke/admin/deliveries) |
| Support tickets | Admin | [Open](http://localhost:3000/admin/support) | [Open](https://novatechstore.co.ke/admin/support) |
| Messages | Admin | [Open](http://localhost:3000/admin/messages) | [Open](https://novatechstore.co.ke/admin/messages) |
| Settings | Admin | [Open](http://localhost:3000/admin/settings) | [Open](https://novatechstore.co.ke/admin/settings) |
| Security | Admin | [Open](http://localhost:3000/admin/security) | [Open](https://novatechstore.co.ke/admin/security) |
| Activity log | Admin | [Open](http://localhost:3000/admin/activity) | [Open](https://novatechstore.co.ke/admin/activity) |

### Dynamic URL values

- `{product-slug}` is the product's `slug` value, for example `iphone-15-pro-max`.
- `{category-slug}` is a category slug, such as `phones`, `laptops`, `tablets`, or `accessories`.
- `{order-id}` is the ID shown on the signed-in customer's Orders page.

API route handlers in `frontend/src/app/api` are intentionally excluded: they are backend endpoints rather than browser pages. For their reference, see the root [API endpoints documentation](../README.md#-backend-api-app-router-route-handlers).

## Documentation Structure

| File | Description |
|------|-------------|
| `README.md` | This overview file |
| `features.md` | Comprehensive list of all implemented features |
| `client-customization.md` | Client branding, theme presets, content, and staging customization guide |

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS 3, Framer Motion, lucide-react |
| **Backend** | Prisma ORM 5, PostgreSQL, Zod, bcrypt |
| **Auth** | NextAuth v5 (beta) — Google OAuth + Credentials |
| **Email** | Resend |
| **Storage** | Cloudflare R2 (AWS SDK v3) |
| **Payments** | M-Pesa (Daraja STK Push), Stripe Payment Intents |
| **Notifications** | Twilio SMS, WhatsApp Cloud API |
| **Monorepo** | npm workspaces (`frontend` + `backend`) |

## Quick Links

- [Features](features.md) — Complete list of implemented features
- [Client customization](client-customization.md) — Branding, themes, content, and client setup
- [Page links](#page-links) — Development and production URLs for every UI page
- [Database Schema](../README.md#database-schema-overview) — Prisma model overview
- [API Endpoints](../README.md#-backend-api-app-router-route-handlers) — Backend API reference
- [Environment Variables](../README.md#-environment-variables) — Required config variables
- [Getting Started](../README.md#-getting-started) — Development setup guide
