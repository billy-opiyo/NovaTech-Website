# Nurava Tech SaaS architecture decisions

**Status:** Tenant foundation and source-level SaaS billing implementation complete; live database/provider rollout remains gated
**Date:** 2026-08-21

This document records implementation defaults for the first controlled beta. It does not constitute legal, tax, payment-provider, or commercial advice.

## Product scope

- Initial customers are independent Kenyan electronics shops, phone and laptop dealers, repair/accessory businesses, and small distributors.
- The first release hosts separate merchant stores. It is not a multi-vendor marketplace and never mixes products from different stores in one cart.
- The beta includes a hosted storefront, catalog discovery, staff memberships, theme/content controls, basic analytics, platform subdomains, merchant-direct shopper enquiries, merchant SaaS billing, and platform support.
- Advanced warehouse management, marketplace carts, custom application work, and enterprise database isolation remain later-stage work.

## Platform and tenant defaults

- The initial deployment uses one Next.js application and one PostgreSQL database with server-enforced logical tenant isolation.
- The canonical platform domain is `nuravatech.com`; merchant platform hosts use `{store-slug}.nuravatech.com` once DNS and deployment routing are configured.
- Local development resolves the seeded `novatech` store for `localhost` and `127.0.0.1`, and supports published store previews at `{store-slug}.localhost`; unknown hosts do not silently select a tenant.
- Verified custom domains take precedence over verified platform subdomains, while the canonical `nuravatech.com` and `www.nuravatech.com` hosts are reserved for platform discovery and are resolved before merchant domain records.
- A store must be published and its host verified before public storefront resolution. Suspended, unpublished, unknown, and unverified hosts produce explicit unavailable states.
- The server-resolved store context is authoritative. A tenant/store ID supplied by a browser request is never used to widen access.

## Shopper discovery and storefront behavior

- `/stores` is the shopper-facing directory. It lists published stores whose tenant is active or trialing and links to each store's host-resolved storefront.
- Store discovery is a platform-home action only: the platform homepage and directory expose the store-browsing path, while individual storefront headers do not show a `Browse Stores` action once a shopper is inside a merchant store.
- The platform homepage and directory may show approved review ratings, review volume, product counts, and catalogue image previews to support store choice, but they do not create a shared marketplace cart. Product browsing and selection remain inside the selected store, then the shopper contacts that merchant directly to complete the transaction.
- Merchant store homepage component order and responsive layout remain shared across stores. Branding, hero copy, categories, featured products, testimonials, newsletter copy, contact details, and map links come from the active `StoreContext`; these merchant sections are not rendered on the platform root homepage.
- Merchant storefront action controls remain host-specific. The platform root focuses on discovery, while merchant footers link back to the canonical Nurava Tech homepage for choosing another store.
- A signed-in shopper's `User.preferredStoreId` is updated after a valid host-based store resolution. The legacy preferred-store cookie is a browser fallback for returning visitors. Neither value authorizes access or replaces tenant scoping.
- `?all=1` provides an explicit browse-all escape hatch when a preferred store would otherwise be selected.

These behaviors are implemented in source. Public DNS/SSL, a live database migration, regenerated Prisma Client, and live multi-store browser verification remain deployment and Phase 5 tasks.

## Commercial and payment gates

- The initial plan catalog is entitlement-based and database-backed: `TRIAL`, `STARTER`, `BUSINESS`, and `ENTERPRISE`. The implementation defaults for Starter, Business, and Enterprise are seed data and remain configurable.
- Launch commercial configuration is Kenya/KES, monthly billing, a 30-day trial, a 3-day payment grace period, no automatic overages, and M-Pesa-only SaaS collection. The final tax rate/treatment, refund wording, privacy/retention documents, support SLA text, and operator identity remain launch gates.
- SaaS billing (merchant to Nurava Tech) remains separate from shopper commerce (customer to merchant), with separate ledgers, webhooks, credentials, and audit events.
- The approved shopper model is merchant-direct: Nurava Tech provides discovery, storefront hosting, and enquiry handoff, while each independent merchant handles its own payment, delivery, refunds, warranty, taxes, and customer support. Nurava Tech does not collect shopper payments or present itself as merchant of record.
- SaaS billing stores tenant billing references and uses invoice-driven M-Pesa setup-fee, first-subscription, and renewal collection at launch. Stripe remains provider-ready but is disabled by the launch billing configuration. Shopper payment initiation and verification routes are disabled in this model.

### Source-level SaaS billing behavior

- Merchant owners and admins use `/manage/billing` to view the current plan, setup-fee state, subscription status, invoices, payment history, payment methods, and add-ons. Plan changes, cancellation, renewal collection, and add-on changes are server-authorized.
- Platform owners and admins use `/platform/billing` to manage plan and add-on configuration, including recurring prices and one-time setup fees, and inspect billing customers and subscriptions.
- Super Admins and authorized platform operators use `/platform/operations` to inspect aggregate tenant/store metrics, recent cross-store activity, SaaS invoices, store previews, billing/setup-fee state, and store publication status. Suspension and reactivation actions are platform-authorized and audited.
- Stripe subscription, invoice, payment-failure, and cancellation state is webhook-authoritative and idempotent. Browser return URLs do not activate subscriptions.
- M-Pesa setup fees and first subscriptions are combined into one post-trial invoice; later renewals are invoice-driven. A successful provider callback updates the invoice/payment state and then synchronizes the related billing record, pending plan, tenant, and subscription.
- Historical shopper order payments may have separate commission transactions using an effective plan rate snapshot; new shopper payment and commission creation is disabled in merchant-direct mode.
- Migration `0006_billing_system` and the regenerated Prisma Client must be deployed before the new billing routes can run against a target database. Live provider credentials, webhook registration, and sandbox/provider verification remain rollout gates.

## Lifecycle and data policy defaults

- Tenant subscription states are `TRIALING`, `ACTIVE`, `PAST_DUE`, `GRACE_PERIOD`, `SUSPENDED`, `CANCELLED`, `INCOMPLETE`, and `UNPAID`.
- Setup-fee state is tracked separately as `PENDING`, `PAID`, `FAILED`, or `WAIVED`; add-on subscriptions have independent `ACTIVE`, `PAST_DUE`, `CANCELLED`, and `INCOMPLETE` states.
- Webhook receipts are idempotent and authoritative; browser success pages never activate a subscription.
- Suspension protects merchant data and stops public selling before any deletion action.
- Tenant deletion is soft deletion followed by an export/retention workflow. The retention duration and deletion schedule require legal/privacy approval before launch.
- Platform support access is explicit, least-privilege, logged, and read-only by default.

## Permission boundary

Platform roles: `PLATFORM_OWNER`, `PLATFORM_ADMIN`, `PLATFORM_SUPPORT`, and `PLATFORM_ANALYST`.

Merchant roles: `STORE_OWNER`, `STORE_ADMIN`, `STORE_MANAGER`, `STORE_SUPPORT`, and `STORE_EDITOR`.

Every protected operation must verify the session, resolved store, active membership, and operation permission. A global user role is not sufficient for merchant access.

## Threat-model priorities

The first isolation tests target object IDs, slugs, hostnames, active-store cookies, API bodies, uploads, payment callbacks, exports, and webhook replay. Queries and mutations must carry tenant scope, and logs must not contain secrets, access tokens, passwords, or unnecessary customer data.

Launch remains blocked until professional legal/tax review covers merchant-of-record status, payment collection, customer-data processing, electronic communications, merchant responsibilities, terms, privacy, cookies, acceptable use, and refunds.
