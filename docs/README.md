# Nurava Tech — Documentation

This directory contains documentation for the Nurava Tech hosted storefront platform, whose first release supports separate electronics stores for the Kenyan market.

## Project Overview

Nurava Tech is a **monorepo** managed with **npm workspaces**, containing:

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Backend**: Prisma ORM 6.19.3, PostgreSQL (Neon), Node.js

The platform enables customers to discover published stores at `/stores`, then browse, search, and compare electronics (phones, laptops, tablets, and accessories) before contacting the selected independent store directly. Each merchant confirms its own sale, payment, delivery, refunds, and warranty. Stores keep separate catalogs and storefront context.

## Recent Changes

The latest implementation updates include:

- Added public company and customer-service pages for About, Blog, FAQs, Warranty, and Return Policy, linked through the footer's dynamic Customer Service and Quick Links sections.
- Added direct `tel:` and `mailto:` links to the contact information shown on the home page.
- Replaced the header's hardcoded logo with the Nurava Tech icon served through Next.js `Image`.
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
- Added migration `0026_platform_access_invitations` for Super Admin-managed platform operator invitations and one-time acceptance records.
- Replaced process-local rate limiting with PostgreSQL-backed rate-limit buckets for multi-instance deployments.
- Added historical checkout idempotency, payment request reuse, and webhook receipt deduplication for Stripe and M-Pesa compatibility flows; new shopper order/payment creation is disabled in merchant-direct mode.
- Added database-backed SaaS billing with Starter/Business/Enterprise plans, setup-fee records, subscriptions, invoices, add-ons, provider payments, and commission transactions.
- Added commercial-alignment enforcement for M-Pesa add-on activation, grace-period public access, server-side storage and analytics entitlements, paid WhatsApp order-update gating, explicit newsletter consent/unsubscribe, and tenant-scoped storage/newsletter records through migration `0015_commercial_alignment`.
- Added merchant `/manage/billing` actions for Stripe Checkout/portal, M-Pesa invoice collection, plan changes, cancellation, renewal, setup-fee payment, add-ons, and billing history.
- Added platform `/platform/billing` reporting and configuration for plans, add-ons, subscriptions, customers, revenue, commissions, invoices, and failed SaaS payments.
- Added the platform operations control plane at `/platform/operations` with cross-store metrics, tenant/store search, activity and invoice feeds, storefront preview links, billing/setup-fee visibility, and authorized suspension/reactivation controls.
- Added the protected `/api/cron/lifecycle` Vercel Cron route with an hourly schedule, database-backed execution lease, subscription lifecycle sweep, and retention sweep. Configure `CRON_SECRET` and deploy migrations `0015_commercial_alignment` and `0016_scheduled_job_locks` before enabling it in production.
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
- Added consistent authenticated account controls: profile avatars are shown when available, otherwise the user's capitalized initial is used; account menus provide Account and Sign out while preserving the current platform/store destination.
- Added profile image upload support in account settings, including storage-key generation, supported image formats, a 1 MB limit, and saved light/dark theme preferences.
- Added shared one-megabyte image validation, browser/server WebP optimization for product images, and a separate 10 MB limit for verification PDFs.
- Refreshed the branded splash screen with immediate rendering, a responsive gradient wordmark, animated progress treatment, and no intentional blank navy interval; it remains limited to the platform home/control-plane experience.
- Added public email verification and password reset flows, plus searchable public legal pages for privacy, cookies, and terms.
- Added SEO metadata and image-host preconnect configuration, and improved navbar text truncation and shared notification behavior.
- Added the shopper `/stores` directory, published-store filtering, featured-product context, per-store host links, and a browse-all escape hatch.
- Preserved the shared homepage structure for every store while resolving branding, homepage content, contact details, and map links from the active `StoreContext`.
- Added authenticated preferred-store persistence through `User.preferredStoreId`, with a legacy preferred-store cookie as a returning-browser fallback. This preference is not an authorization mechanism.
- Added local `{store-slug}.localhost` resolution. Production subdomain links and DNS/SSL still require deployment configuration and verification.
- Added staging/preview Vercel project-host recognition and explicit `/store/{slug}` routing so merchant context remains distinct from the platform root. Custom subdomain DNS/SSL reachability remains a deployment concern.
- Restricted `Browse Stores` to the SaaS platform homepage and directory; individual store desktop and mobile navigation no longer expose it.
- Restructured the platform root homepage around social-proof store discovery, with approved ratings, review volume, product counts, catalogue image previews, and top-rated/most-reviewed/new-and-growing store groups.
- Kept merchant homepage shopping sections and action controls on individual store hosts, and added a `Nurava Tech Homepage` footer link for returning to platform discovery.
- The merchant footer return link uses the canonical `https://nuravatech.com` platform host in deployed environments and the active local root during local subdomain previews. The server reserves both `nuravatech.com` and `www.nuravatech.com` for platform discovery before merchant domain lookup.
- Restricted the branded splash to the platform homepage and protected `/platform` control plane; individual store routes and legacy `/admin` routes do not show it.
- Platform footer support, FAQ, privacy, and terms surfaces target merchants. Individual store hosts retain shopper support links and shopper-facing policy variants.
- Added platform-only `Home`, `Browse Stores`, and `Create Store` links to the desktop and mobile top navigation; merchant storefront navigation remains store-specific.
- Added the nine-step, preview-only `Onboarding Merchant Guide` below `New and growing stores`. It mirrors the real store-creation stages, supports pagination, timed advance, previous/next controls, touch swipes on smaller screens, theme-matched previews, and a final-step-only `Create Store` CTA.
- Added Super Admin platform-access invitations with `PLATFORM_ADMIN`, `PLATFORM_SUPPORT`, and `PLATFORM_ANALYST` roles, invited-email matching, one-time acceptance, and seven-day expiry.
- Added social-link validation and normalized WhatsApp destinations in store settings, plus loading feedback and four-second viewport-safe toast notifications for important asynchronous actions.
- Extended review moderation with controlled admin edit and delete operations while preserving approval status and public approved-review filtering.

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
- Browser merchant-handoff workflow and separate SaaS payment sandbox workflows.
- Stripe/M-Pesa webhook verification against provider sandboxes.
- PostgreSQL backup and restore verification.
- Linux production build and deployment smoke test.
- Dependency vulnerability remediation or documented risk acceptance.
- Final production credentials, seeded credential rotation, monitoring, and alerting.

Credentials are intentionally not documented here and must be configured only after the implementation and staging gates pass.

## Page links

Start the local server with `npm run dev`. The development server uses `http://localhost:3000`; the production base URL is `https://nuravatech.com`.

The tables below list every UI page implemented under `frontend/src/app`. `Signed in` pages redirect unauthenticated visitors to sign-in. The canonical merchant admin workspace is `/manage` on the merchant's verified host, while the Nurava Tech platform control plane is `/platform` on the platform host. Both are server-protected and marked no-index. `/admin` is retained only as a legacy ADMIN/SUPERADMIN console and is not the merchant link to share.

Store discovery is separate from storefront commerce: `/stores` helps a shopper choose a store, while the store's host shows that store's catalog and direct merchant contact options. The merchant completes the shopper transaction outside Nurava Tech's payment flow.

### Storefront

| Page | Access | Development | Production |
|---|---|---|---|
| Store directory | Public | [Open](http://localhost:3000/stores) | [Open](https://nuravatech.com/stores) |
| Home | Public | [Open](http://localhost:3000/) | [Open](https://nuravatech.com/) |
| Products | Public | [Open](http://localhost:3000/products) | [Open](https://nuravatech.com/products) |
| Product detail | Public; dynamic | `http://localhost:3000/products/{product-slug}` | `https://nuravatech.com/products/{product-slug}` |
| Category landing | Public; dynamic | `http://localhost:3000/category/{category-slug}` | `https://nuravatech.com/category/{category-slug}` |
| Phones category | Public | [Open](http://localhost:3000/category/phones) | [Open](https://nuravatech.com/category/phones) |
| Laptops category | Public | [Open](http://localhost:3000/category/laptops) | [Open](https://nuravatech.com/category/laptops) |
| Tablets category | Public | [Open](http://localhost:3000/category/tablets) | [Open](https://nuravatech.com/category/tablets) |
| Accessories category | Public | [Open](http://localhost:3000/category/accessories) | [Open](https://nuravatech.com/category/accessories) |
| Deals | Public | [Open](http://localhost:3000/deals) | [Open](https://nuravatech.com/deals) |
| Compare products | Public | [Open](http://localhost:3000/compare) | [Open](https://nuravatech.com/compare) |
| Contact | Public | [Open](http://localhost:3000/contact) | [Open](https://nuravatech.com/contact) |
| About | Public | [Open](http://localhost:3000/about) | [Open](https://nuravatech.com/about) |
| Blog | Public | [Open](http://localhost:3000/blog) | [Open](https://nuravatech.com/blog) |
| FAQs | Public | [Open](http://localhost:3000/faqs) | [Open](https://nuravatech.com/faqs) |
| Return policy | Public | [Open](http://localhost:3000/return-policy) | [Open](https://nuravatech.com/return-policy) |
| Warranty | Public | [Open](http://localhost:3000/warranty) | [Open](https://nuravatech.com/warranty) |
| Cart | Signed in | [Open](http://localhost:3000/cart) | [Open](https://nuravatech.com/cart) |
| Merchant handoff | Signed in | [Open](http://localhost:3000/checkout) | [Open](https://nuravatech.com/checkout) |

### Authentication

| Page | Access | Development | Production |
|---|---|---|---|
| Sign in | Public | [Open](http://localhost:3000/auth/signin) | [Open](https://nuravatech.com/auth/signin) |
| Sign up | Public | [Open](http://localhost:3000/auth/signup) | [Open](https://nuravatech.com/auth/signup) |
| Forgot password | Public | [Open](http://localhost:3000/auth/forgot-password) | [Open](https://nuravatech.com/auth/forgot-password) |
| Reset password | Public; token required | [Open](http://localhost:3000/auth/reset-password) | [Open](https://nuravatech.com/auth/reset-password) |
| Verify email | Public; verification code required | [Open](http://localhost:3000/auth/verify-email) | [Open](https://nuravatech.com/auth/verify-email) |
| Accept merchant invitation | Public; one-time token, then invited-email authentication | `http://localhost:3000/auth/accept-invitation?token={token}` | `https://{merchant-host}/auth/accept-invitation?token={token}` |

### Legal and policy pages

| Page | Access | Development | Production |
|---|---|---|---|
| Privacy policy | Public | [Open](http://localhost:3000/privacy-policy) | [Open](https://nuravatech.com/privacy-policy) |
| Cookie policy | Public | [Open](http://localhost:3000/cookie-policy) | [Open](https://nuravatech.com/cookie-policy) |
| Terms and conditions | Public | [Open](http://localhost:3000/terms) | [Open](https://nuravatech.com/terms) |

### Customer account

| Page | Access | Development | Production |
|---|---|---|---|
| Account overview | Signed in | [Open](http://localhost:3000/account) | [Open](https://nuravatech.com/account) |
| Orders | Signed in | [Open](http://localhost:3000/account/orders) | [Open](https://nuravatech.com/account/orders) |
| Order detail | Signed in; dynamic | `http://localhost:3000/account/orders/{order-id}` | `https://nuravatech.com/account/orders/{order-id}` |
| Order tracking | Signed in; dynamic | `http://localhost:3000/account/orders/{order-id}/track` | `https://nuravatech.com/account/orders/{order-id}/track` |
| Addresses | Signed in | [Open](http://localhost:3000/account/addresses) | [Open](https://nuravatech.com/account/addresses) |
| Wishlist | Signed in | [Open](http://localhost:3000/account/wishlist) | [Open](https://nuravatech.com/account/wishlist) |
| Notifications | Signed in | [Open](http://localhost:3000/account/notifications) | [Open](https://nuravatech.com/account/notifications) |
| Account settings | Signed in | [Open](http://localhost:3000/account/settings) | [Open](https://nuravatech.com/account/settings) |

### Admin console

| Page | Access | Development | Production |
|---|---|---|---|
| Admin root (redirects to dashboard) | Admin | [Open](http://localhost:3000/admin) | [Open](https://nuravatech.com/admin) |
| Dashboard | Admin | [Open](http://localhost:3000/admin/dashboard) | [Open](https://nuravatech.com/admin/dashboard) |
| Analytics | Admin | [Open](http://localhost:3000/admin/analytics) | [Open](https://nuravatech.com/admin/analytics) |
| Products | Admin | [Open](http://localhost:3000/admin/products) | [Open](https://nuravatech.com/admin/products) |
| Orders | Admin | [Open](http://localhost:3000/admin/orders) | [Open](https://nuravatech.com/admin/orders) |
| Customers | Admin | [Open](http://localhost:3000/admin/customers) | [Open](https://nuravatech.com/admin/customers) |
| Reviews | Admin | [Open](http://localhost:3000/admin/reviews) | [Open](https://nuravatech.com/admin/reviews) |
| Coupons | Admin | [Open](http://localhost:3000/admin/coupons) | [Open](https://nuravatech.com/admin/coupons) |
| Inventory | Admin | [Open](http://localhost:3000/admin/inventory) | [Open](https://nuravatech.com/admin/inventory) |
| Deliveries | Admin | [Open](http://localhost:3000/admin/deliveries) | [Open](https://nuravatech.com/admin/deliveries) |
| Support tickets | Admin | [Open](http://localhost:3000/admin/support) | [Open](https://nuravatech.com/admin/support) |
| Messages | Admin | [Open](http://localhost:3000/admin/messages) | [Open](https://nuravatech.com/admin/messages) |
| Settings | Admin | [Open](http://localhost:3000/admin/settings) | [Open](https://nuravatech.com/admin/settings) |
| Security | Admin | [Open](http://localhost:3000/admin/security) | [Open](https://nuravatech.com/admin/security) |
| Activity log | Admin | [Open](http://localhost:3000/admin/activity) | [Open](https://nuravatech.com/admin/activity) |
| Launch readiness | Store membership; server-backed checks | [Open](http://localhost:3000/manage/readiness) | `https://{merchant-host}/manage/readiness` |

### Merchant workspace and platform control plane

| Page | Access | Development | Production |
|---|---|---|---|
| Store onboarding | Signed in | [Open](http://localhost:3000/onboarding) | [Open](https://nuravatech.com/onboarding) |
| Merchant dashboard | Store membership | `http://{store-slug}.localhost:3000/manage` | `https://{merchant-host}/manage` |
| Merchant billing | Store owner/admin for mutations | `http://{store-slug}.localhost:3000/manage/billing` | `https://{merchant-host}/manage/billing` |
| Platform overview | Platform role | [Open](http://localhost:3000/platform) | [Open](https://nuravatech.com/platform) |
| Platform operations | Platform role | [Open](http://localhost:3000/platform/operations) | [Open](https://nuravatech.com/platform/operations) |
| Platform billing | Platform owner/admin | [Open](http://localhost:3000/platform/billing) | [Open](https://nuravatech.com/platform/billing) |
| Platform access | Super Admin | [Open](http://localhost:3000/platform/access) | [Open](https://nuravatech.com/platform/access) |
| Merchant enquiries and quotes | Store membership; quote creation owner/admin | `http://{store-slug}.localhost:3000/manage/enquiries` | `https://{merchant-host}/manage/enquiries` |
| Catalog import/export | Store owner/admin/manager/editor | `http://{store-slug}.localhost:3000/manage/catalog` | `https://{merchant-host}/manage/catalog` |
| Launch readiness | Store membership; read-only checklist | `http://{store-slug}.localhost:3000/manage/readiness` | `https://{merchant-host}/manage/readiness` |

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
| `User Manual.md` | Deep operational guide for shoppers, merchants, platform operators, and developers |
| `Future Updates.md` | Prioritized roadmap for advanced features, productivity, revenue, security, and scale |

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS 3, Framer Motion, lucide-react |
| **Backend** | Prisma ORM 6.19.3, PostgreSQL, Zod, bcrypt |
| **Auth** | NextAuth v5 (beta) — Google OAuth + Credentials |
| **Email** | Resend |
| **Storage** | Cloudflare R2 (AWS SDK v3) |
| **Payments** | Merchant-direct shopper handoff plus Stripe Billing and invoice-driven M-Pesa SaaS billing |
| **Notifications** | Twilio SMS, WhatsApp Cloud API |
| **Monorepo** | npm workspaces (`frontend` + `backend`) |

## Quick Links

- [Features](features.md) — Complete list of implemented features
- [Client customization](client-customization.md) — Branding, themes, content, and client setup
- [User Manual](User%20Manual.md) — Full operating guide
- [Future Updates](Future%20Updates.md) — Advanced feature and implementation roadmap
- [Page links](#page-links) — Development and production URLs for every UI page
- [Database Schema](../README.md#database-schema-overview) — Prisma model overview
- [API Endpoints](../README.md#-backend-api-app-router-route-handlers) — Backend API reference
- [Environment Variables](../README.md#-environment-variables) — Required config variables
- [Getting Started](../README.md#-getting-started) — Development setup guide
