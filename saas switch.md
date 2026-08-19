# NovaTech SaaS Switch Plan

## Autonomous execution log

### 2026-08-19 — Phase 0 complete; Phase 1 complete

- Confirmed the repository is clean on `main` and the current data model is single-store.
- Added `docs/saas-architecture-decisions.md` with beta defaults, tenant URL rules, role boundaries, lifecycle states, payment separation, and explicit commercial/legal gates.
- No live prices, tax assumptions, merchant-of-record claim, or provider credentials were invented.
- Added additive Prisma tenant infrastructure: `Tenant`, `Store`, `Domain`, `Membership`, `Invitation`, `Plan`, `Subscription`, `UsageCounter`, `FeatureEntitlement`, and `StoreSettingsVersion`.
- Added nullable ownership columns and tenant indexes to merchant-owned catalog, cart, order, payment, address, review, coupon, notification, support, and audit records.
- Added migration `backend/prisma/migrations/0004_saas_tenant_foundation` to create the schema, seed the NovaTech tenant/store/verified platform host, and backfill existing rows to `novatech-tenant`.
- Added `resolveTenantFromRequest()`, hostname normalization, deny-by-default `tenantScope()`, active membership checks, and tenant isolation tests.
- Updated development seed data so the admin is a platform owner and store owner, and new catalog data belongs to the NovaTech tenant.
- Verification passed: Prisma validate, frontend TypeScript, backend TypeScript, full test suite (39/39), focused tenant tests (4/4), and `git diff --check`.
- Runtime boundary: no `DATABASE_URL` was available for a real migration/restore or live tenant-resolution probe; full tests use their existing no-database fallback and emitted expected missing-provider warnings.

### Next phase

- Phase 2 completed: added session propagation for `platformRole`, server-side `requireStoreSession()` and `requirePlatformSession()` guards, authenticated workspace middleware, and route-backed `/manage` and `/platform` surfaces.
- Existing admin screens are available under `/manage` with store-workspace navigation; `/platform/tenants` and `/platform/billing` are truthful unavailable states until database/provider-backed operations are connected.
- The legacy `/admin` controllers still contain global role checks and unscoped API queries; they remain a Phase 3/5 migration item before any merchant-facing beta.
- Verification passed: frontend TypeScript, backend TypeScript, and `git diff --check`.
- Final checkpoint: full test suite passed 40/40; frontend and backend TypeScript checks passed; repository status is clean.
- Current commits on `main`: `a8b1d77`, `34c4707`, `b41ae83`, `029249c`, `94cee18`, `8c1746f`, and `bf4ae48`.
- Execution is blocked from claiming a complete SaaS launch by external dependencies: a real `DATABASE_URL` for migration/restore verification, approved merchant-of-record/payment strategy, SaaS billing and shopper-payment provider credentials, DNS/SSL control for subdomains/custom domains, and professional legal/tax/privacy review.
- Phase 3 slice completed: root metadata/theme/branding now consume a server-resolved `StoreContext`; authenticated onboarding creates a trial tenant/store/membership/subscription/domain; store design saves validated drafts and publishes versioned settings through `/api/manage/store/*`.
- The remaining Phase 3 work is converting every catalog, cart, checkout, account, upload, notification, and admin API query to use the resolved context, plus custom-domain and preview routing.
- Phase 3 isolation checkpoint completed: catalog, product mutations, carts, orders, coupon validation, reviews, wishlists, and product uploads now use host-resolved tenant scope; upload keys use `tenants/{tenantId}/stores/{storeId}/...`.
- Remaining commerce boundary work includes payment callback tenant/order matching, account/address/notification/support scoping, admin API conversion, custom-domain verification, and preview routing.
- Phase 4 billing core checkpoint completed: added subscription lifecycle transition validation, plan entitlement lookup, server-side usage-limit assertions, and tenant-scoped `/api/manage/billing` plus merchant subscription status UI.
- Live SaaS checkout, provider webhooks, invoices, and payment-connection setup remain disabled until the documented merchant-of-record/provider decision and credentials are supplied.
- Security checkpoint completed: account addresses, notifications, shopper payment order lookups, and payment-created orders now carry/request-check tenant scope; cross-tenant payment IDs are rejected before provider calls.
- Verification passed: frontend TypeScript, backend TypeScript, and `git diff --check`.
- Full test suite passed: 39/39. Existing test-only provider/database warnings remain expected and no live database migration was attempted.

### Next phase

- Continue Phase 3: tenant-scope the existing catalog and commerce API paths, then add preview and custom-domain verification behavior before billing work.

**Date:** 18 August 2026
**Current product:** NovaTech Store, a single-store electronics e-commerce application
**Target product:** A multi-tenant SaaS platform that lets independent digital-electronics merchants create, brand, manage, and publish their own online stores

## 1. Recommended product direction

NovaTech should become a hosted commerce platform for electronics merchants, rather than a collection of separately configured NovaTech websites.

Each paying client should be able to:

- create an account and a store;
- choose a store name, URL, logo, colors, fonts, and homepage content;
- add products, variants, categories, images, stock, prices, warranties, and promotions;
- connect the payment and delivery methods they are authorized to use;
- invite staff with limited permissions;
- publish a responsive storefront on a platform subdomain and, later, a custom domain;
- receive and manage orders from one merchant dashboard;
- see analytics for their own store only; and
- upgrade, downgrade, pause, or cancel their SaaS subscription.

The platform operator should have a separate control plane for tenants, plans, billing, platform support, abuse handling, system health, and aggregate reporting. A merchant must never be treated as a platform administrator.

The current implementation is a good commerce engine for one store, but it is not yet a SaaS product. The largest change is introducing a server-enforced tenant boundary throughout the database, authentication, APIs, storage, payments, analytics, cache, emails, and URLs.

## 2. Current foundation and required classification

| Current area | Status for SaaS | Required direction |
|---|---|---|
| Next.js App Router storefront | Existing foundation | Reuse the components, but resolve the active store from the request hostname instead of one hard-coded brand. |
| Product catalog, variants, cart, checkout, orders, reviews, coupons | Existing single-store foundation | Add `tenantId`/`storeId` ownership and scope every query and mutation. |
| Prisma/PostgreSQL | Existing foundation | Extend the schema for tenants, memberships, plans, subscriptions, domains, settings, entitlements, and merchant-owned data. |
| NextAuth/Auth.js users and roles | Partial | Replace global `CUSTOMER`, `ADMIN`, and `SUPERADMIN` authorization with platform roles plus tenant memberships. |
| `frontend/src/config/client.config.ts` | Prototype deployment configuration | Move client branding, SEO, navigation, homepage content, commerce defaults, and feature flags into database-backed store settings. Keep code defaults only as safe fallbacks. |
| `frontend/src/config/theme-presets.ts` | Reusable foundation | Expose approved presets in a tenant theme editor with validation and preview. Do not allow arbitrary CSS or unsafe HTML. |
| M-Pesa and Stripe shopper payments | Existing integration | Make provider selection and credentials tenant-aware. Define whether the platform or each merchant is the merchant of record before enabling live payments. |
| Admin routes under `/admin` | Existing single-store admin | Split into `/platform/*` for NovaTech staff and `/manage/*` for each merchant. |
| R2 storage | Existing foundation | Add tenant-prefixed object keys, ownership checks, quotas, deletion rules, and signed URL controls. |
| Staging, migrations, CI, tests, health checks, backups | Existing readiness foundation | Add tenant-isolation tests, subscription webhook tests, domain tests, and cross-tenant security tests. |

## 3. Define the SaaS business before implementation

Decide these points before changing the payment or database design:

### Target customer

Start with independent electronics shops, phone dealers, laptop retailers, repair-and-accessory businesses, and small distributors that need a professional storefront without building software themselves.

### Minimum viable offer

The first paid version should include:

- hosted storefront;
- product, variant, category, inventory, coupon, and order management;
- responsive theme customization;
- merchant staff accounts;
- customer checkout;
- email order notifications;
- basic analytics;
- platform subdomain;
- trial and subscription management; and
- platform support.

Leave advanced marketplace behavior, multi-vendor carts, complicated warehouse management, and custom app development for later. This product should initially host separate stores, not combine products from multiple merchants into one marketplace cart.

### Suggested plan structure

Use entitlements rather than hard-coding plan names in UI or route guards.

| Plan | Suitable first limits |
|---|---|
| Trial | Time-limited evaluation, one store, limited products/orders, platform subdomain, test payments only. |
| Starter | One store, a practical product limit, core checkout, basic theme controls, basic analytics, platform support. |
| Growth | More products and staff, custom domain, advanced promotions, exports, richer analytics, priority support. |
| Business | Higher limits, multiple locations or catalogs, advanced roles, onboarding assistance, SLA/support options. |

The final prices, currency, tax treatment, trial length, overage rules, grace period, and annual discount should be commercial decisions documented separately. Product limits must be enforced on the server, not only displayed in the dashboard.

### Merchant of record decision

Separate these two payment flows:

1. **SaaS billing:** the merchant pays NovaTech for use of the platform.
2. **Shopper checkout:** a shopper pays for products sold by that merchant.

The platform must decide whether it processes shopper money on behalf of merchants or whether each merchant connects its own M-Pesa/Stripe account. This affects contracts, refunds, settlements, chargebacks, tax, KYC, reporting, and compliance. Do not silently reuse NovaTech's current payment credentials for every merchant.

## 4. Tenant and URL architecture

Use a shared application and shared PostgreSQL database initially, with strict logical tenant isolation. A separate database per merchant can be considered later for enterprise isolation, but it is not necessary for the first SaaS release.

Support these URL forms in stages:

- marketing site: `https://novatechstore.co.ke` or the chosen platform domain;
- merchant preview: `https://{store-slug}.platform-domain.example`;
- merchant custom domain: `https://shop.clientdomain.example`;
- merchant dashboard: `https://{store-slug}.platform-domain.example/manage` or a central dashboard with an explicit active-store selector;
- platform control plane: `/platform` with platform-staff authorization.

Implement a single `resolveTenantFromRequest()` server utility that:

- normalizes the host and removes ports in development;
- resolves a verified custom domain first;
- falls back to a verified platform subdomain;
- rejects unknown, suspended, unpublished, and unverified domains with truthful states;
- returns the tenant/store ID and request context; and
- never trusts a client-provided `tenantId` in a form, query string, or JSON body.

Do not rely on the current pathname alone. A tenant-aware request context must be established before catalog, cart, order, review, upload, analytics, or admin logic runs.

## 5. Database and data-model changes

Create a migration rather than using `db:push` for shared environments. The core additions should include:

### Platform and tenant models

- `Tenant` or `Organization`: legal owner, status, plan reference, trial dates, billing status, created-by user, and suspension/deletion timestamps.
- `Store`: public name, slug, publication status, default locale, currency, country, timezone, logo, favicon, theme settings, SEO settings, contact details, homepage content, navigation, and commerce defaults.
- `Domain`: hostname, type (`PLATFORM_SUBDOMAIN` or `CUSTOM`), verification token/status, SSL status, canonical flag, and timestamps.
- `Membership`: user, tenant, membership role, invitation status, invited-by user, and accepted timestamp.
- `Invitation`: tenant, email, role, token hash, expiry, and acceptance state.
- `Plan`: public name, internal key, price, billing interval, active flag, and entitlement definitions.
- `Subscription`: tenant, provider customer ID, provider subscription ID, plan, status, trial dates, current period, cancel-at-period-end, and past-due/grace-period state.
- `UsageCounter` or metered usage records: products, storage, staff, orders, and other billable limits by tenant and period.
- `FeatureEntitlement`: plan or tenant override, feature key, value, and effective dates.

### Existing model changes

Add a required `tenantId` or `storeId` to every merchant-owned record, including at least `Category`, `Product`, `Variant`, `CartItem`, `WishlistItem`, `RecentlyViewed`, `Order`, `Payment`, `OrderItem`, `Address`, `DeliveryRegion`, `Review`, `Coupon`, `Notification`, `SupportTicket`, `TicketReply`, `AdminLog`, and any inventory or analytics record.

Then add tenant-aware constraints and indexes, for example:

- unique `[tenantId, slug]` for products, categories, and coupons;
- unique `[tenantId, sku]` for product SKUs;
- unique `[tenantId, code]` for coupons;
- unique `[tenantId, orderNumber]` for public order references;
- indexes on `[tenantId, createdAt]`, `[tenantId, status]`, and common catalog filters;
- unique `[tenantId, userId, productId]` where a customer can save one item per store; and
- unique `[tenantId, idempotencyKey]` for checkout retry protection.

The current global uniqueness of product slugs, SKUs, category names, and coupon codes must be removed where it would prevent two merchants from using the same legitimate value.

Keep a global `User` identity if desired, but make access store-specific through `Membership`. A shopper may have an account on more than one store, while a merchant staff member may belong to several stores with different roles.

For safer migration, first add nullable tenant fields, create one tenant/store representing the current NovaTech data, backfill every existing row, add validation and indexes, then make the fields required and remove the old global assumptions.

## 6. Authentication, authorization, and tenant isolation

Replace the current global admin check with two independent authorization layers:

### Platform roles

- `PLATFORM_OWNER`: full platform control;
- `PLATFORM_ADMIN`: tenant, billing, support, and operational management;
- `PLATFORM_SUPPORT`: support access with restricted customer and financial visibility; and
- `PLATFORM_ANALYST`: aggregate, read-only reporting.

### Merchant membership roles

- `STORE_OWNER`: billing, store deletion, domains, integrations, and all store settings;
- `STORE_ADMIN`: daily store operations and staff management;
- `STORE_MANAGER`: products, inventory, orders, promotions, and reports;
- `STORE_SUPPORT`: customers, tickets, and orders without financial/provider settings; and
- `STORE_EDITOR`: catalog and content editing only.

Every protected server action must verify:

1. the authenticated user;
2. the resolved tenant/store;
3. an active membership in that tenant; and
4. the required permission for the specific action.

Do not encode the active store only in a browser cookie. A cookie can select a preferred store, but the server must verify the membership and scope every database query. Add automated tests that attempt to read, update, delete, upload, export, and pay against another tenant's IDs.

Add tenant-aware rate-limit keys such as `tenantId:userId:action` alongside IP limits. Keep platform emergency access explicit, logged, time-limited where practical, and read-only by default.

## 7. Store builder and merchant onboarding

Add a first-run onboarding flow:

1. create account and verify email;
2. create store name and unique slug;
3. select business country, currency, timezone, and language;
4. choose an approved theme preset;
5. upload logo and favicon;
6. enter store contact and social details;
7. create or import categories and products;
8. configure shipping and payment methods;
9. preview the storefront;
10. connect a subdomain or start custom-domain verification; and
11. complete a publish checklist before making the store public.

Replace the developer-only `client.config.ts` workflow with database-backed settings and a versioned settings schema. The editor should provide validated controls for:

- brand identity;
- colors, typography, mode preferences, and layout options;
- homepage hero, categories, featured products, deals, testimonials, and newsletter content;
- navigation and footer links;
- contact, WhatsApp, business hours, and support details;
- SEO title, description, social image, and indexing policy;
- currency, shipping thresholds, delivery zones, returns, warranty, and tax display; and
- feature toggles permitted by the merchant's plan.

Add draft/published settings so a merchant can preview changes without exposing incomplete content. Keep a rollback history for important settings and log who published each version.

## 8. Merchant storefront changes

Refactor shared storefront components to receive a server-resolved `StoreContext` rather than importing one global `clientConfig`.

Required storefront behavior:

- render the active merchant's name, logo, favicon, colors, contact information, navigation, policies, and SEO metadata;
- use the active store's currency and locale for money and dates;
- show only that store's products, categories, reviews, coupons, delivery regions, and orders;
- generate store-specific sitemap, robots rules, canonical URLs, Open Graph data, and structured product data;
- keep cart and wishlist state scoped by store, including local-storage keys;
- prevent a cart from mixing products from different stores;
- display unpublished or suspended stores as clear unavailable pages;
- preserve the existing responsive, accessible splash, navigation, search, theme, cart, and account behavior while making all content tenant-aware; and
- make every named contact, navigation, checkout, and account control route-backed for the current store.

The marketing homepage should no longer look like one merchant's product catalog. It should sell the SaaS value proposition and link to pricing, templates, demo stores, documentation, sign-up, sign-in, and support. A demo store should be a separate seeded tenant with clearly marked demo data.

## 9. Merchant dashboard and platform control plane

### Merchant dashboard: `/manage`

Refactor the existing admin sections into a store workspace:

- Overview and sales analytics;
- Products, variants, categories, and media;
- Inventory and stock movements;
- Orders, payments, refunds, and delivery status;
- Customers and store-specific account data;
- Reviews and moderation;
- Coupons, campaigns, and homepage merchandising;
- Store design and content;
- Shipping, tax, and checkout settings;
- Payment-provider connection status;
- Staff, roles, and invitations;
- Domains and publishing;
- Subscription and usage;
- Support; and
- Store activity log.

### Platform control plane: `/platform`

Create separate platform-only screens for:

- tenant search, onboarding, status, and suspension;
- plan and entitlement management;
- subscription and failed-payment monitoring;
- domain verification and SSL status;
- platform support tickets and impersonation/audit controls;
- aggregate system health and queue status;
- storage, API, and usage monitoring;
- abuse, fraud, and content reports;
- platform-wide announcements; and
- backup, restore, and incident records.

Platform analytics may aggregate operational information, but must not expose one merchant's customer, order, margin, or payment details to another merchant.

## 10. Billing, limits, and lifecycle states

Implement a subscription state machine rather than a single `active` flag:

`TRIALING → ACTIVE → PAST_DUE → GRACE_PERIOD → SUSPENDED → CANCELLED`

Also support `INCOMPLETE` or `UNPAID` states returned by the billing provider. Webhooks, not the browser success page, must be authoritative for subscription status.

Add:

- checkout for SaaS plans;
- customer billing portal or equivalent self-service screens;
- invoice and receipt history;
- plan changes with proration rules;
- cancellation and end-of-period behavior;
- failed-payment emails and dashboard warnings;
- grace-period rules that protect merchant data;
- export before deletion;
- tenant soft deletion and retention policy; and
- idempotent subscription webhook processing with signature verification and receipt storage.

When a limit is reached, show a truthful upgrade or limit-reached state. Enforce limits in service code for product count, storage bytes, staff seats, domains, orders, exports, and enabled features. Never rely on disabled buttons as the enforcement mechanism.

## 11. Payments, storage, email, and integrations

### Shopper payments

Create a tenant-aware payment configuration and connection model. Each payment attempt must contain the tenant, order, currency, provider, provider account/reference, and immutable amount. Verify that the provider callback belongs to the correct tenant and order before changing payment or order status.

For M-Pesa, define whether each merchant uses its own shortcode or a platform collection flow. For Stripe, define whether merchants use connected accounts or the platform account. Store only provider references and encrypted credentials/tokens where necessary; do not put secrets in `client.config.ts`, browser storage, product data, or ordinary audit details.

### Storage

Use keys such as `tenants/{tenantId}/stores/{storeId}/products/{assetId}` and enforce ownership before upload, read, replacement, or deletion. Add per-plan storage quotas, image validation, malware/content scanning where appropriate, signed URL expiry, and cleanup for deleted products and stores.

### Notifications

Make sender identity, templates, reply-to addresses, SMS, and WhatsApp settings tenant-aware. Keep platform billing and security messages separate from merchant order messages. Add event delivery records, retries, dead-letter visibility, and truthful unavailable states when a provider is not configured.

### Background jobs

Move webhook handling, email, SMS, WhatsApp, image processing, exports, analytics aggregation, and domain checks into retryable jobs as tenant volume grows. Every job payload must include the tenant/store ID and be safe to retry.

## 12. Security, privacy, and reliability requirements

Before public SaaS launch, implement and verify:

- deny-by-default tenant query helpers or repositories;
- authorization tests for every tenant-owned API route;
- cross-tenant object-ID and slug access tests;
- signed webhook verification and idempotency for all providers;
- encryption for provider credentials and sensitive integration settings;
- secret rotation and environment separation for development, staging, and production;
- audit logs for staff invitations, permission changes, exports, billing, domains, refunds, and impersonation;
- account recovery, email verification, MFA for platform staff, and recommended MFA for store owners;
- secure cookie, CSRF, origin, security-header, and content-security-policy review;
- abuse controls for store creation, sign-up, uploads, coupon validation, checkout, and messaging;
- per-tenant backups or clearly documented shared-backup restore procedures;
- tenant export and deletion workflows;
- data retention, privacy, cookie, terms, acceptable-use, merchant agreement, and refund documents; and
- an incident-response process with status communication and audit evidence.

Obtain professional legal and tax advice for the jurisdictions served, especially around merchant-of-record status, payment collection, customer data processing, electronic communications, and merchant responsibilities. The application should not present legal assumptions as completed compliance.

## 13. Testing and observability changes

Extend the existing test suite with:

- tenant resolution tests for platform subdomains, custom domains, unknown domains, and suspended stores;
- membership and role-permission tests;
- database tests proving every merchant query includes tenant scope;
- catalog, cart, checkout, coupon, review, support, upload, and analytics isolation tests;
- plan entitlement and server-side limit tests;
- subscription lifecycle and billing webhook tests;
- payment callback tenant/order matching tests;
- custom-domain verification tests;
- store draft/preview/publish tests;
- data export and soft-deletion tests;
- Playwright journeys for merchant signup, onboarding, publish, customer checkout, and subscription cancellation; and
- load tests for catalog reads, search, checkout, webhooks, and tenant creation.

Add observability dimensions for `tenantId`, `storeId`, request ID, user ID, route, provider, and job ID. Monitor error rate, latency, failed webhooks, failed payments, failed notifications, storage usage, job retries, sign-up conversion, trial conversion, churn, and suspended stores. Do not log payment secrets, access tokens, passwords, or unnecessary customer data.

## 14. Recommended implementation phases

### Phase 0 — Product and architecture decisions

- Confirm target merchants, geography, plans, trial, pricing, and support model.
- Decide merchant-of-record and payment-connection strategy.
- Choose platform and subdomain domains.
- Define tenant lifecycle, data retention, support access, and service limits.
- Write the permission matrix and threat model.

### Phase 1 — Tenant foundation

- Add tenant/store, membership, domain, plan, subscription, and settings models.
- Create the NovaTech store as the first tenant and backfill all existing data.
- Implement request tenant resolution and tenant-scoped repositories.
- Add migration, seed, rollback, and backup procedures.

### Phase 2 — Identity and dashboard separation

- Add platform roles and merchant memberships.
- Add invitations, active-store selection, permission checks, and audit events.
- Move existing admin features into `/manage`.
- Create the first `/platform` tenant and billing screens.

### Phase 3 — Store builder and storefront runtime

- Replace global `clientConfig` reads with database-backed `StoreContext`.
- Build onboarding, theme/content editing, preview, publish, and rollback.
- Add platform-subdomain routing and store-specific SEO.
- Scope carts, accounts, products, orders, reviews, coupons, uploads, and notifications.

### Phase 4 — Billing and merchant integrations

- Implement SaaS plan checkout and subscription webhooks.
- Add usage counters and hard server-side entitlements.
- Add tenant-aware shopper payment connections and test-mode setup.
- Add shipping, tax, email, SMS, WhatsApp, and custom-domain settings.

### Phase 5 — Hardening and controlled beta

- Run security, isolation, payment, backup/restore, load, accessibility, and browser tests.
- Launch with a small group of invited electronics merchants.
- Observe onboarding completion, first-product time, first-publish time, checkout success, support demand, and payment failures.
- Fix operational gaps before public self-service sign-up.

### Phase 6 — Public launch and scale

- Publish pricing and SaaS marketing pages.
- Enable self-service sign-up, billing, domain connection, and support workflows.
- Add usage-based scaling, queues, cache invalidation, read replicas, and enterprise isolation only when usage justifies them.

## 15. Definition of an effective SaaS launch

The switch is ready for a controlled beta only when:

- a new merchant can sign up, create a store, add products, preview, and publish without developer edits;
- two merchants can use identical SKUs, slugs, coupon codes, and product names without collision;
- a user cannot access another store's data by changing an ID, slug, hostname, cookie, or API payload;
- merchant staff see only permitted sections and records;
- SaaS billing and shopper checkout are separate, auditable flows;
- payment, webhook, refund, and subscription states are provider-verified;
- a merchant can export its data and the platform can restore backups;
- custom domains, suspension, cancellation, and failed-payment states are truthful and tested;
- branding, SEO, currency, content, and contact details are store-specific;
- staging remains isolated from production credentials and data;
- monitoring and alerts identify tenant-specific failures; and
- the legal, pricing, support, and merchant responsibilities are published clearly.

## 16. First implementation slice

The safest first coding slice is the tenant foundation, not billing or a new marketing homepage:

1. add `Tenant`, `Store`, and `Membership` models;
2. create a NovaTech tenant and backfill existing records;
3. implement `resolveTenantFromRequest()`;
4. add tenant scope to products, categories, carts, orders, coupons, reviews, and uploads;
5. write cross-tenant authorization tests; and
6. keep the current storefront visually stable while it renders from the first tenant's database-backed settings.

Once this slice is verified, billing, onboarding, custom domains, and merchant self-service can be built on a real isolation boundary instead of being layered onto the current single-store assumptions.
