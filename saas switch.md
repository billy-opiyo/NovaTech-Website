# Nurava Tech SaaS Switch Plan

## Current implementation status (2026-08-21)

The tenant foundation and source-level merchant SaaS billing slice are
implemented. Current billing code includes database-backed
`TRIAL`/`STARTER`/`BUSINESS`/`ENTERPRISE` plans, setup-fee records,
subscriptions, invoices, add-ons, invoice-driven M-Pesa billing, and
server-side plan entitlements. Stripe code remains provider-ready but is not
the launch billing path.

Merchant billing is available under `/manage/billing`; platform billing
configuration and reporting is under `/platform/billing`. The
`0006_billing_system`, `0010_commercial_billing_decisions`, `0011_merchant_verification`,
`0012_secure_merchant_verification`, `0013_retention_lifecycle`, and
`0014_merchant_legal_acceptance` migrations and
regenerated Prisma Client still need to be deployed to a reachable target
database. Live M-Pesa credentials, private R2 bucket configuration, the
merchant verification encryption key, provider dashboard callback registration,
SMS sandbox tests, final legal/tax documents, individual-operator details, and
production rollout remain external gates.

Merchant verification is now a source-level lifecycle: merchants can submit a
review request from `/manage/verification`, platform operators can approve or
reject it from `/platform/operations`, and public host/directory resolution and
store publication require `APPROVED`. Migration `0011_merchant_verification`
stores only restricted status, timestamps, reviewer, and notes. Identity,
KRA/tax, contact, location, and merchant M-Pesa evidence are handled by the
secure intake slice described below. Final legal/privacy review and external
storage/SMS configuration remain launch gates.

The secure intake slice is now implemented in migration
`0012_secure_merchant_verification`: encrypted structured details, hashed
phone OTP verification, private-bucket evidence uploads, evidence status
review, and five-minute reviewer download URLs. The source does not place
verification documents in public product storage or expose object keys to
merchants.

The credential-free lifecycle slice is implemented in migration
`0013_retention_lifecycle` and `backend/workers/lifecycle.ts`. It applies the
fourteen-day trial/renewal grace rules, schedules 90-day merchant-data retention
after access ends, preserves SaaS billing/legal records, and processes due
tenants idempotently. It must be run by a deployed scheduler before it is
treated as automatic production behavior.

The execution notes below are historical checkpoints and may describe the
pre-billing state.

## Approved provisional commercial decisions (2026-08-21)

- Launch market and currency: Kenya and KES.
- Each independent merchant is the merchant of record for its own electronics
  sales, shopper payments, delivery, returns, refunds, warranties, product
  taxes, and shopper complaints. Nurava does not collect shopper funds.
- Merchant SaaS pricing is monthly: Starter KES 1,500 plus KES 5,000 setup;
  Business KES 3,500 plus KES 5,000 setup; Enterprise KES 8,500 plus KES 1,500
  setup. New stores receive a six-month free Founding Merchant pilot on Starter
  limits, followed by a 14-day payment grace period; setup and first
  subscription are collected together after the pilot when the merchant
  chooses a plan.
  Update (MVP billing policy): superseded — new stores now receive a six-month
  free Founding Merchant pilot on Starter limits (`NURAVA_MVP_PILOT_DAYS`,
  default 180) with no payment during creation and no automatic charges,
  followed by a 14-day payment grace period with reminders before the
  storefront pauses; setup and first subscription are collected together only
  after the pilot, when the merchant chooses a plan.
- M-Pesa is the only SaaS billing method at launch. Renewals are invoice-driven,
  provider-callback-authoritative, and do not assume automatic recurring debit.
- Starter, Business, and Enterprise include 50, 250, and 1,000 active products;
  3, 15, and 100 staff accounts; and 2 GB, 10 GB, and 50 GB storage. Product
  additions are blocked at the server-side limit rather than billed as
  surprise overages.
- Starter uses a Nurava subdomain and basic analytics. Business adds one
  custom domain and advanced analytics. Enterprise supports custom domain
  expansion, advanced analytics, and negotiated support/SLA terms.
- WhatsApp notifications are an opt-in paid add-on. Merchant promotional
  messaging requires consent and unsubscribe controls.
- These are launch configuration decisions, not legal or tax advice. The agreed
  SaaS policy is 16% VAT-inclusive pricing when enabled, no routine subscription
  refunds, conditional setup-fee refunds, automatic outage credits after 24
  continuous hours, and the retention windows recorded in the merchant
  agreement. Professional review must still confirm the final tax treatment,
  privacy/terms wording, refund language, entity details, and registered
  operator identity before production self-service billing.

## Autonomous execution log

### 2026-08-20 — DNS/SSL production preparation

- Centralized `PLATFORM_DOMAIN` and production public-URL handling so tenant subdomain resolution and custom-domain validation use one configuration source.
- Added production-only HSTS response headers and documented the Vercel wildcard-domain topology, registrar/DNS requirements, custom-domain sequence, and verification commands in `docs/dns-ssl-runbook.md`.
- No database migration, DNS record change, certificate issuance, or secret configuration was attempted.
- Verification passed: frontend/backend TypeScript and `git diff --check`; external verification requires Vercel project and registrar access.
- Runtime boundary: Vercel domain attachment, wildcard nameserver delegation, DNS propagation, custom-domain routing, and SSL issuance remain external account operations.

### 2026-08-19 — Non-external SaaS implementation checkpoint complete

- Completed every remaining source-level SaaS feature identified in this execution that does not require live billing, payment-provider credentials, DNS/SSL control, or legal/commercial decisions: tenant isolation hardening, membership authorization, local design preview, staff invitations, domain onboarding state, entitlement/usage visibility, protected API error handling, tenant data export, payment tenant matching, and store settings rollback.
- Final verification passed: full test suite 44/44, frontend TypeScript, backend TypeScript, and `git diff --check`.
- Local preview is running on `http://localhost:3000`; homepage probe returned HTTP 200 with Nurava Tech content. Database-backed routes correctly remain unavailable against the unreachable configured Neon database.
- Remaining launch gates are intentionally untouched: database migration/restore verification, live SaaS billing and shopper payment providers, DNS/SSL automation, provider webhooks in production, and legal/tax/privacy/commercial decisions.

### 2026-08-19 — Store settings rollback

- Added owner/admin-protected store settings rollback from the latest 20 published versions.
- Rollback restores the selected settings as a new published version, preserving the previous version for recovery and keeping all version queries tenant/store scoped.
- Added version history and restore controls to `/manage/design`; local-preview mode keeps rollback disabled because browser-only drafts are not published records.
- Verification passed: frontend TypeScript, backend TypeScript, and `git diff --check`.
- Runtime boundary: rollback needs the migrated/reachable database and does not alter external DNS, billing, payment, or legal configuration.

### 2026-08-19 — Tenant-scoped payment verification and review moderation

- Payment initiation reuse and payment verification now resolve the request tenant before reading existing payment records; successful verification confirms only an order belonging to the same tenant.
- Customer review deletion now uses store membership roles for staff moderation instead of global `ADMIN`/`SUPERADMIN` role checks, while customers retain ownership-based deletion.
- Verification passed: frontend TypeScript, backend TypeScript, and `git diff --check`.
- Runtime boundary: payment providers remain disabled/unverified without credentials; real cross-store behavior still requires migrated tenant data.

### 2026-08-19 — Tenant data export

- Added owner-only `GET /api/manage/data-export` and `/manage/data-export` with tenant-scoped export of store settings, catalog, orders, payment status, reviews, coupons, memberships, domains, and support records.
- Export queries use the resolved tenant and store IDs and intentionally omit passwords, invitation tokens, provider references, payment metadata, and other secrets.
- Added a workspace navigation entry and documented that deletion/retention behavior remains a separate policy decision.
- Verification passed: frontend TypeScript, backend TypeScript, and `git diff --check`.
- Runtime boundary: export data requires the migrated/reachable tenant database; no destructive operation or legal retention assumption was introduced.

### 2026-08-19 — Payment callback tenant matching

- Added a fail-closed tenant ownership check before payment webhooks confirm an order or cancel a pending order.
- Payment-linked orders now require non-null, matching payment and order tenant IDs; mismatches are acknowledged without mutating the order.
- Added a regression test for matching, mismatching, and missing tenant ownership.
- Verification passed: backend TypeScript, focused webhook tests (7/7), and `git diff --check`; expected tests continued to report the unavailable local database without failing.
- Runtime boundary: provider signature verification, live callback delivery, payment credentials, and tenant migration remain external/runtime gates.

### 2026-08-19 — Protected API error handling

- Added a shared controller error boundary that preserves explicit authentication, authorization, not-found, and conflict statuses while returning a truthful unavailable response for infrastructure failures.
- Applied the boundary to the tenant-scoped admin, order, inventory, coupon, review, security, delivery, and audit routes so membership/context failures no longer escape as generic framework errors.
- Verification passed: frontend TypeScript, backend TypeScript, and `git diff --check`.
- Runtime boundary: the error boundary does not bypass authorization or create database data; live tenant behavior still requires the migrated database.

### 2026-08-19 — Entitlement and usage visibility

- Extended `/api/manage/billing` with the resolved tenant's configured plan entitlements and current-period usage counters, all scoped by tenant membership.
- Expanded `/manage/billing` to show configured plan metadata, subscription lifecycle state, entitlement limits, usage bars, and current counter periods without inventing prices or provider actions.
- At this checkpoint, truthful unavailable states were preserved: plan changes, invoices, payment portals, and live webhook behavior were disabled until billing credentials and provider configuration existed. The later source-level billing implementation is summarized at the top of this document.
- Verification passed: frontend TypeScript and `git diff --check`.
- Runtime boundary: entitlement and usage reads require the migrated tenant database; live billing remains intentionally unconfigured.

### 2026-08-19 — Inventory isolation and stock authorization

- Converted inventory overview, low-stock, out-of-stock, alerts, reorder, movement-history, and stock-mutation services to require the resolved `tenantId`.
- Replaced legacy global admin-role checks on inventory routes with active store membership checks for store owners, admins, and managers.
- Cross-tenant product and variant stock mutations now fail as not found before any update is attempted.
- Added an isolation regression test covering product and variant stock writes.
- Verification passed: frontend TypeScript, backend TypeScript, inventory syntax check, and the focused inventory isolation test.
- Runtime boundary: real inventory data still requires the tenant migration and reachable database; no live provider or billing work was enabled.

### 2026-08-19 — Recommendation isolation

- Converted personalized, trending, similar, featured, new-arrival, and deal recommendations to receive the resolved `tenantId`.
- Scoped recently viewed items, orders, wishlists, category lookups, product reads, and cross-product recommendations by tenant.
- Recommendation routes now resolve the request host before reading catalog or shopper history and preserve truthful database-unavailable responses.
- Added an isolation regression test covering featured and similar-product reads.
- Verification passed: frontend TypeScript, backend TypeScript, and the focused recommendation isolation test.
- Runtime boundary: recommendation data still requires the tenant migration and reachable database; no provider or billing work was enabled.

### 2026-08-19 — Store membership authorization for products and orders

- Removed remaining global `ADMIN`/`SUPERADMIN` authorization decisions from product mutations and merchant order operations.
- Order reads now distinguish a shopper's own order from store-staff access using the active store membership, while every lookup remains tenant-scoped.
- Order, product, and inventory audit records now retain the resolved tenant boundary.
- Order statistics now require the request tenant and an authorized store-management membership.
- Verification passed: frontend TypeScript, backend TypeScript, and `git diff --check`.
- Runtime boundary: real authorization results still require migrated tenant/membership data; no provider or billing behavior was enabled.

### 2026-08-19 — Local store design preview

- Expanded `/manage/design` with a live approved-theme preview for store name, hero copy, SEO description, typography, colors, and storefront cards.
- Added browser-local draft persistence for development when the database is unavailable.
- Local preview mode clearly disables publication and labels browser-only changes; it never claims that settings were published or database-persisted.
- Verification passed: frontend TypeScript and `git diff --check`.
- Runtime boundary: database-backed draft persistence and publication remain unchanged and unavailable without the migrated database.

### 2026-08-19 — Staff invitations and workspace identity

- Added server-authoritative store invitations with hashed one-time tokens, seven-day expiry, role validation, duplicate checks, invited-email matching, and membership creation on acceptance.
- Added `/manage/team` with least-privilege role selection, pending-invitation visibility, and explicit manual-link delivery state when email is not configured.
- Added the invitation acceptance API and removed fabricated “Admin User / Super Admin” identity text from the shared workspace shell.
- Verification passed: frontend TypeScript, backend TypeScript, and `git diff --check`.
- Runtime boundary: invitation persistence and acceptance require the tenant database; outbound invitation email remains intentionally disabled without an email delivery decision/configuration.

### 2026-08-19 — Custom-domain onboarding state

- Added tenant-scoped custom-domain registration, duplicate protection, removal, verification-token generation, and DNS TXT-record instructions.
- Added `/manage/domains` with truthful pending DNS and unreported SSL states; the UI never claims DNS verification or certificate issuance.
- Added domain validation that rejects platform subdomains, localhost hostnames, paths, and malformed hostnames.
- Verification passed: frontend TypeScript, backend TypeScript, and `git diff --check`.
- Runtime boundary: DNS checks, SSL issuance, and public custom-domain routing remain external infrastructure work.

### 2026-08-19 — Phase 5 tenant-boundary hardening slice

- Added a regression test for `{store-slug}.localhost` request resolution.
- Converted legacy support and analytics controllers/services to resolve the active store from the request host, require an active store membership, and include `tenantId` in all ticket, reply, order-reporting, and export queries.
- Converted legacy customer, coupon, review, delivery, security, and activity-log admin endpoints to use store membership authorization and tenant-scoped reads/writes.
- Admin action records now retain the tenant boundary when emitted by store-workspace operations.
- Verification passed: frontend TypeScript, backend TypeScript, `git diff --check`, and full test suite (41/41).
- Runtime boundary remains unchanged: applying the tenant migration and verifying real multi-store routing still require a reachable database; live SaaS billing, shopper-payment connections, DNS/SSL, and legal/provider decisions remain external gates.

### 2026-08-19 — Phase 0 complete; Phase 1 complete

- Confirmed the repository is clean on `main` and the current data model is single-store.
- Added `docs/saas-architecture-decisions.md` with beta defaults, tenant URL rules, role boundaries, lifecycle states, payment separation, and explicit commercial/legal gates.
- No live prices, tax assumptions, merchant-of-record claim, or provider credentials were invented.
- Added additive Prisma tenant infrastructure: `Tenant`, `Store`, `Domain`, `Membership`, `Invitation`, `Plan`, `Subscription`, `UsageCounter`, `FeatureEntitlement`, and `StoreSettingsVersion`.
- Added nullable ownership columns and tenant indexes to merchant-owned catalog, cart, order, payment, address, review, coupon, notification, support, and audit records.
- Added migration `backend/prisma/migrations/0004_saas_tenant_foundation` to create the schema, seed the Nurava Tech tenant/store/verified platform host, and backfill existing rows to `novatech-tenant`.
- Added `resolveTenantFromRequest()`, hostname normalization, deny-by-default `tenantScope()`, active membership checks, and tenant isolation tests.
- Updated development seed data so the admin is a platform owner and store owner, and new catalog data belongs to the Nurava Tech tenant.
- Verification passed: Prisma validate, frontend TypeScript, backend TypeScript, full test suite (39/39), focused tenant tests (4/4), and `git diff --check`.
- Runtime boundary: no `DATABASE_URL` was available for a real migration/restore or live tenant-resolution probe; full tests use their existing no-database fallback and emitted expected missing-provider warnings.

### Next phase

- Phase 2 completed: added session propagation for `platformRole`, server-side `requireStoreSession()` and `requirePlatformSession()` guards, authenticated workspace middleware, and route-backed `/manage` and `/platform` surfaces.
- Existing admin screens are available under `/manage` with store-workspace navigation; `/platform/operations` and `/platform/billing` are platform-role-protected control-plane surfaces that show truthful unavailable states until database/provider-backed operations are connected.
- Legacy `/admin` controllers and their `/manage` route aliases now use store membership authorization and tenant-scoped reads/writes; the remaining runtime proof requires migrated multi-store data.
- Verification passed: frontend TypeScript, backend TypeScript, and `git diff --check`.
- Final checkpoint: full test suite passed 40/40; frontend and backend TypeScript checks passed; repository status is clean.
- Current commits on `main`: `a8b1d77`, `34c4707`, `b41ae83`, `029249c`, `94cee18`, `8c1746f`, and `bf4ae48`.
- Execution is blocked from claiming a complete SaaS launch by external dependencies: a real `DATABASE_URL` for migration/restore verification, approved merchant-of-record/payment strategy, SaaS billing and shopper-payment provider credentials, DNS/SSL control for subdomains/custom domains, and professional legal/tax/privacy review.
- Phase 3 slice completed: root metadata/theme/branding now consume a server-resolved `StoreContext`; authenticated onboarding creates a trial tenant/store/membership/subscription/domain; store design saves validated drafts and publishes versioned settings through `/api/manage/store/*`.
- The source-level Phase 3 context conversion is complete for catalog, cart, checkout, account, upload, notification, admin, and host-based storefront paths; local design preview and custom-domain onboarding are implemented with truthful external-state boundaries.
- Phase 3 isolation checkpoint completed: catalog, product mutations, carts, orders, coupon validation, reviews, wishlists, and product uploads now use host-resolved tenant scope; upload keys use `tenants/{tenantId}/stores/{storeId}/...`.
- Payment callback tenant/order matching, account/address/notification/support scoping, and admin API conversion are complete; custom-domain verification/SSL and production preview routing remain infrastructure work.
- Phase 4 billing core checkpoint completed: added subscription lifecycle transition validation, plan entitlement lookup, server-side usage-limit assertions, and tenant-scoped `/api/manage/billing` plus merchant subscription status UI.
- Live SaaS checkout, provider webhooks, invoices, and payment-connection setup remain disabled until the documented merchant-of-record/provider decision and credentials are supplied.
- Security checkpoint completed: account addresses, notifications, shopper payment order lookups, and payment-created orders now carry/request-check tenant scope; cross-tenant payment IDs are rejected before provider calls.
- Verification passed: frontend TypeScript, backend TypeScript, and `git diff --check`.
- Full test suite passed: 39/39. Existing test-only provider/database warnings remain expected and no live database migration was attempted.
- Shopper discovery slice completed before Phase 5: `/stores` lists published stores and featured product context, links to each store's host-resolved storefront, and provides a browse-all escape hatch for returning shoppers.
- The shared homepage order is preserved for every store while hero copy, categories, featured products, testimonials, newsletter copy, contact details, and map links are read from the active `StoreContext`.
- Added authenticated `User.preferredStoreId` persistence plus a legacy preferred-store browser fallback. Store visits update the preference only after host-based tenant resolution; the preference never authorizes access or replaces tenant scoping. The existing cookie key is retained for compatibility.

### 2026-08-20 — Nurava Tech brand and documentation migration

- Updated current Markdown documentation, platform copy, metadata, public URLs, and operational messaging to use the Nurava Tech brand.
- Set the canonical platform domain to `nuravatech.com` and documented the production DNS/SSL target as `nuravatech.com` with `*.nuravatech.com` for tenant subdomains.
- Standardized platform email usage to `hello@nuravatech.com` for outbound mail and `support@nuravatech.com` for support routing.
- Preserved internal migration names, legacy browser keys, seeded compatibility identifiers, asset filenames, and historical repository paths so existing data and runtime lookups remain safe.
- Verification: Markdown-wide old-brand scan now finds only documented compatibility/history identifiers; documentation links and current brand/domain references use Nurava Tech.

### 2026-08-20 — Preferred-store cookie compatibility migration

- Renamed the active browser preference cookie to `nurava-preferred-store`.
- Existing `novatech-preferred-store` cookies are read as a one-time fallback and expired after the preference is saved, so this migration does not affect authorization or tenant isolation.
- The seeded local slug, database tenant/store IDs, migration history, export format, and repository folder name remain unchanged because they require a coordinated database/URL or workspace migration.
- Verification: frontend TypeScript, backend TypeScript, full tests (46/46), local homepage HTTP 200, and `git diff --check`.

### 2026-08-20 — Prepared database brand follow-up migration

- Added unapplied Prisma migration `0007_nurava_brand_domain` for the database step.
- It changes the seeded tenant/store display names to Nurava Tech and changes the seeded platform hostname to `novatech.nuravatech.com`.
- It intentionally preserves `novatech-tenant`, `novatech-store`, `novatech-domain`, and the `novatech` store slug so existing foreign keys and host resolution remain valid until a separately planned slug migration.
- The migration has not been applied because database rollout remains scheduled as the second-last production-readiness step.

### 2026-08-20 — Merchant-direct shopper commerce model

- Revised the shopper experience so Nurava Tech provides store discovery, storefront hosting, product marketing, and merchant SaaS tools, while each independent merchant remains responsible for its own customer transaction.
- Replaced platform shopper checkout with a merchant handoff page that sends the selected products to the store through WhatsApp or email; the merchant confirms availability, delivery, payment, refunds, taxes, and warranty directly.
- Disabled new platform shopper order creation, shopper Stripe/M-Pesa initiation and verification, and new transaction commission creation with a fail-closed `MERCHANT_DIRECT` boundary. Existing historical order/payment records and webhook code remain available for data continuity.
- Kept merchant SaaS billing separate and active: platform subscriptions, setup fees, add-ons, Stripe billing, and invoice-driven M-Pesa billing are unaffected.
- External boundary: merchant agreements, final privacy/consumer wording, tax treatment, and any payment-provider responsibilities still require professional review before production launch.

### 2026-08-20 — Merchant-direct implementation verification

- Updated README and feature/architecture/billing documentation to describe merchant handoff rather than platform shopper checkout.
- Updated merchant and platform billing/admin wording so commission data is identified as historical and SaaS billing remains the active Nurava Tech billing flow.
- Verified frontend and backend TypeScript checks, `git diff --check`, and all 46 repository tests.
- Verified the local preview at `http://localhost:3002`: the home page returns 200, the merchant handoff page returns 200, and shopper order/card/M-Pesa endpoints return 410 `MERCHANT_DIRECT_SALES`.
- Local store previews support `{slug}.localhost`; production directory links use `{slug}.{PLATFORM_DOMAIN}`. The existing mobile artwork remains the storefront background for tablet/iPad widths.

### 2026-08-20 — Super Admin operations control plane

- Added `/platform/operations` and `/api/platform/operations` for cross-store metrics, tenant/store search and status filtering, product/order/support counts, subscription and setup-fee status, recent platform activity, SaaS invoice visibility, and local/production storefront preview links.
- Added platform-authorized suspend/reactivate controls that update tenant/store availability together and record an auditable platform action. Read access is available to platform roles; mutations are limited to Super Admin, Platform Owner, and Platform Admin.
- Added setup-fee and recurring-price inputs to `/platform/billing`; plan edits are persisted through the existing platform billing API and apply to future billing configuration.
- Verification remains gated on the configured database for real tenant metrics; unavailable database states remain explicit and do not use fabricated data.

### 2026-08-20 — Platform social-proof store discovery

- Restructured the platform root homepage so first-time shoppers see store discovery instead of merchant shopping sections. It now groups published stores as Top Rated, Most Reviewed, and New and Growing using approved review ratings/review volume, product counts, and catalogue image previews.
- Kept merchant hero, shop-by-category, featured products, testimonials, newsletter, contact/map sections, and merchant search/cart/account/mobile/floating actions on individual store hosts only.
- Added a `Nurava Tech Homepage` quick link to merchant-store footers. It returns to the canonical platform homepage and uses the local platform host during `{slug}.localhost` previews.
- The platform discovery ranking is based only on stored approved reviews and catalogue data; stores without review history are labeled as new/growing rather than assigned an unsupported quality claim.

### 2026-08-20 — Canonical platform footer navigation fix

- Corrected the merchant-store `Nurava Tech Homepage` footer link so it always targets the canonical platform host `https://nuravatech.com` in deployed environments, rather than inheriting an individual store URL.
- Local merchant previews now target the platform root on the active local port, and the link uses a normal browser navigation to switch hosts reliably.

### 2026-08-20 — Canonical platform host resolution fix

- Updated server host resolution so `nuravatech.com` and `www.nuravatech.com` are recognized as platform hosts before any merchant `Domain` record is consulted.
- Platform-root store context now uses Nurava Tech platform defaults and loads the discovery directory separately, preventing a stale or misassigned domain row from rendering an individual merchant homepage after the footer navigation.
- Merchant subdomains and verified custom domains retain their tenant-specific resolution; only the canonical platform hosts bypass merchant-domain lookup.
- Verification: frontend and backend TypeScript checks passed.

### 2026-08-20 — Platform-only splash and merchant support surfaces

- Restricted the branded splash screen to the platform homepage (`/` on the canonical platform host) and the protected `/platform` control plane; individual merchant homepages, merchant pages, and legacy `/admin` pages no longer preload or display it.
- Changed the platform footer section from shopper customer service to merchant support links for onboarding, merchant FAQs, platform support, and subscription billing. Storefront hosts retain shopper-facing contact, FAQ, returns, and warranty links.
- Made the contact and FAQ surfaces host-aware so the platform host explains merchant onboarding, subscriptions, domains, hosting, and platform support while individual stores continue to answer shopper questions.
- Added merchant-focused platform variants of the privacy policy and terms. Storefront hosts retain shopper-facing policy variants that identify the independent merchant as responsible for sales, delivery, refunds, replacements, warranties, and customer support.

### 2026-08-20 — Platform navigation for merchants and shoppers

- Added platform-only top navigation in the order `Home`, `Browse Stores`, and `Create Store`, on both desktop and mobile menus.
- Merchant storefront navigation remains store-specific and does not inherit the platform onboarding or discovery links.

### Pre-Phase 5 handoff

- The shopper discovery and shared-storefront slice is ready for Phase 5 hardening: `/stores` is the shopper entry point, while each store's catalog, cart, account, and checkout remain on that store's resolved host.
- `Browse Stores` is exposed from the SaaS platform homepage/directory only; individual store desktop and mobile navigation keep shoppers inside the active store.
- Phase 5 must deploy and verify migration `0005_shopper_store_preference`, regenerate Prisma Client, test real `{slug}.localhost` and platform-subdomain resolution with a database, and run cross-store browser/isolation checks.
- Remaining pre-launch work still includes payment-provider setup, custom-domain verification, preview routing, unscoped legacy admin/API paths, DNS/SSL, and legal/tax/privacy review.

**Date:** 18 August 2026
**Current implementation:** Nurava Tech's original electronics storefront plus the tenant/store foundation and pre-Phase 5 shopper discovery slice
**Target product:** A multi-tenant SaaS platform that lets independent digital-electronics merchants create, brand, manage, and publish their own online stores

## 1. Recommended product direction

Nurava Tech should become a hosted commerce platform for electronics merchants, rather than a collection of separately configured Nurava Tech websites.

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
| Admin routes under `/admin` | Existing single-store admin | Split into `/platform/*` for Nurava Tech staff and `/manage/*` for each merchant. |
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
| Enterprise | More products and staff, custom domain, advanced promotions, exports, richer analytics, priority support. |
| Business | Higher limits, multiple locations or catalogs, advanced roles, onboarding assistance, SLA/support options. |

The final prices, currency, tax treatment, trial length, overage rules, grace period, and annual discount should be commercial decisions documented separately. Product limits must be enforced on the server, not only displayed in the dashboard.

### Merchant of record decision

Separate these two payment flows:

1. **SaaS billing:** the merchant pays Nurava Tech for use of the platform.
2. **Shopper checkout:** a shopper pays for products sold by that merchant.

The platform must decide whether it processes shopper money on behalf of merchants or whether each merchant connects its own M-Pesa/Stripe account. This affects contracts, refunds, settlements, chargebacks, tax, KYC, reporting, and compliance. Do not silently reuse Nurava Tech's current payment credentials for every merchant.

## 4. Tenant and URL architecture

Use a shared application and shared PostgreSQL database initially, with strict logical tenant isolation. A separate database per merchant can be considered later for enterprise isolation, but it is not necessary for the first SaaS release.

Support these URL forms in stages:

- marketing site: `https://nuravatech.com`;
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

For safer migration, first add nullable tenant fields, create one tenant/store representing the current Nurava Tech data, backfill every existing row, add validation and indexes, then make the fields required and remove the old global assumptions.

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
- Create the Nurava Tech store as the first tenant and backfill all existing data.
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
2. create a Nurava Tech tenant and backfill existing records;
3. implement `resolveTenantFromRequest()`;
4. add tenant scope to products, categories, carts, orders, coupons, reviews, and uploads;
5. write cross-tenant authorization tests; and
6. keep the current storefront visually stable while it renders from the first tenant's database-backed settings.

Once this slice is verified, billing, onboarding, custom domains, and merchant self-service can be built on a real isolation boundary instead of being layered onto the current single-store assumptions.
### 2026-08-22 — Credential-free legal acceptance and retention boundary

- Added server-authoritative, versioned merchant legal acceptance records for trial creation and first selling publication. Onboarding, publication, and rollback require an explicit acknowledgement; the record is included in merchant exports and preserved with billing/legal data.
- Added migration `0014_merchant_legal_acceptance`; it has not been applied to a live database.
- Source validation passed after the change: Prisma formatting/generation, backend TypeScript build, and frontend TypeScript validation. Live database, credentials, provider callbacks, scheduler configuration, and professional legal/tax/privacy review remain final rollout gates.
