# Billing implementation plan

**Status:** Implemented at source level on 2026-08-19. Type, unit, schema, and
repository checks pass. Deployment of the migration, regenerated Prisma
Client, provider credentials, webhooks, and live payment flows remains a
separate rollout step.

## Current architecture audit

Nurava Tech is a Next.js App Router monorepo with shared server-side code under
`backend/`. Prisma/PostgreSQL is the system of record. Merchant workspaces use
`/manage`, platform operators use `/platform`, and storefront requests resolve
their tenant through `resolveTenantFromRequest()` before tenant-owned queries.
Memberships authorize merchant access; platform roles authorize the control
plane.

The repository already contains:

- database-backed `Plan` and `Subscription` models, tenant status/lifecycle
  enums, usage entitlements, and webhook receipt idempotency;
- Stripe PaymentIntent support for shopper checkout and signature-verified
  Stripe webhooks;
- Daraja STK Push/query and M-Pesa callback support;
- merchant `/manage/billing` and platform `/platform/billing` surfaces, now
  implemented by the billing API and dashboard changes described below.

The existing shopper `Payment` model is order-oriented but nullable `orderId`,
so it can safely be extended for SaaS billing payments without creating a
second payment architecture.

## Billing model

1. Keep plans in PostgreSQL. Add Stripe price IDs, setup-fee amount, and the
   plan transaction commission rate to `Plan`. Seed Starter, Business, and
   Enterprise as editable defaults; prices remain database data.
2. Add a tenant billing customer record with Stripe customer/payment-method
   references and the preferred M-Pesa phone. Add a separate billing record
   for setup-fee status so onboarding payment is never confused with recurring
   subscription state.
3. Extend subscriptions with provider checkout/session metadata and add-on
   subscriptions. A Stripe subscription is native recurring billing. M-Pesa is
   represented as invoice-driven collection: each renewal creates an invoice
   and an STK request, with the callback changing the invoice/payment status.
4. Add invoices and extend payments with invoice/subscription/setup-fee
   references, failure information, and a payment kind. Existing order
   payments remain supported.
5. Add database-backed add-ons and tenant add-on subscriptions. Stripe
   recurring prices are optional; when configured they are included as Checkout
   line items or subscription items. M-Pesa add-ons are included in the next
   invoice.
6. Add transaction commission records with a unique source payment/order
   boundary. Commission rate is snapshotted from the active plan so later plan
   edits do not rewrite historical revenue.

## API and authorization changes

- Public/authenticated plan listing is read-only and returns active plans only.
- Merchant billing reads and mutations require an authenticated session plus
  the resolved tenant membership. Plan changes, cancellation, add-on changes,
  and payment-method actions require store owner/admin membership.
- Platform plan/add-on/customer/revenue endpoints require the existing
  platform-role guard; no tenant ID from a request body is trusted.
- Stripe Checkout sessions, customer portal sessions, and M-Pesa collection
  requests are created only on the server from database prices and current
  tenant ownership.
- Stripe webhooks verify the raw signature before parsing, acknowledge
  duplicate event IDs, and process subscription/invoice/payment-failure events
  idempotently. M-Pesa callbacks update only an existing provider reference
  after amount and tenant ownership checks.

## UI changes

- Implement the merchant billing surface with current plan/status, setup-fee
  status, add-ons, invoices, payment history, plan actions, and provider-aware
  checkout buttons. Provider credentials remain an explicit unavailable state
  when absent.
- Implement the platform billing surface with plan/add-on management,
  subscription/customer/revenue summaries, and failed-payment visibility.
- Keep the existing admin shell, tenant resolver, visual language, and
  shopper checkout unchanged.

## Configuration and rollout

Required provider configuration is documented in `.env.example`: Stripe secret,
publishable key, webhook secret, and application URL; M-Pesa Daraja credentials
and callback URL are already present. Stripe price IDs can be set per plan and
add-on after catalog creation. Live rollout still requires provider dashboard
configuration, webhook registration, tax/legal decisions, and a real database
backup/restore check.

Implementation order:

1. Schema and migration, including safe indexes and seed defaults.
2. Billing domain service and provider adapters.
3. Merchant and platform APIs with authorization and idempotency.
4. Stripe/M-Pesa webhook lifecycle handling.
5. Merchant/platform dashboard surfaces.
6. Unit, type, route, and database-backed verification.

The implementation will not claim live provider success without configured
credentials and a real webhook/payment test.
