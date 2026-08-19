# NovaTech SaaS architecture decisions

**Status:** Phase 0 baseline for implementation
**Date:** 2026-08-19

This document records implementation defaults for the first controlled beta. It does not constitute legal, tax, payment-provider, or commercial advice.

## Product scope

- Initial customers are independent Kenyan electronics shops, phone and laptop dealers, repair/accessory businesses, and small distributors.
- The first release hosts separate merchant stores. It is not a multi-vendor marketplace and never mixes products from different stores in one cart.
- The beta includes a hosted storefront, catalog and order operations, staff memberships, theme/content controls, basic analytics, platform subdomains, test-mode shopper payments, and platform support.
- Advanced warehouse management, marketplace carts, custom application work, and enterprise database isolation remain later-stage work.

## Platform and tenant defaults

- The initial deployment uses one Next.js application and one PostgreSQL database with server-enforced logical tenant isolation.
- The canonical platform domain is `novatechstore.co.ke`; merchant platform hosts use `{store-slug}.novatechstore.co.ke` once DNS and deployment routing are configured.
- Local development resolves the seeded `novatech` store for `localhost` and `127.0.0.1`; arbitrary hosts do not silently select a tenant.
- Verified custom domains take precedence over verified platform subdomains.
- A store must be published and its host verified before public storefront resolution. Suspended, unpublished, unknown, and unverified hosts produce explicit unavailable states.
- The server-resolved store context is authoritative. A tenant/store ID supplied by a browser request is never used to widen access.

## Commercial and payment gates

- The initial plan catalog is entitlement-based: `TRIAL`, `STARTER`, `GROWTH`, and `BUSINESS`.
- Prices, billing currency, tax treatment, trial length, grace period, overages, annual discount, refunds, and support SLAs remain commercial decisions and must be entered before self-service billing is enabled.
- SaaS billing (merchant to NovaTech) and shopper checkout (customer to merchant) are separate ledgers, webhooks, credentials, and audit events.
- Shopper payments remain test-mode only until a written merchant-of-record decision and provider connection strategy are approved. The application must not reuse a platform shopper credential for every merchant.
- The implementation models tenant-owned provider connections so the approved future strategy can support merchant-connected Stripe accounts or an approved M-Pesa collection flow without changing order ownership.

## Lifecycle and data policy defaults

- Tenant subscription states are `TRIALING`, `ACTIVE`, `PAST_DUE`, `GRACE_PERIOD`, `SUSPENDED`, `CANCELLED`, `INCOMPLETE`, and `UNPAID`.
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
