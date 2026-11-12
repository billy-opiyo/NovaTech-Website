# SaaS Billing and M-Pesa Collection

**Current implementation status (2026-10-13):** The platform destination and
merchant phone-transfer flows are implemented in the current source. Migrations
`0037_platform_mpesa_destination`, `0038_merchant_phone_shopper_payments`, and
`0039_platform_mpesa_destination_options` are present. Migration 0039 was
deployed to the configured staging Neon database on 2026-10-13; Prisma then
reported the staging schema up to date. This does not establish production
migration status or verify live Daraja payments.

This document records the current behavior and rollout boundaries. The user
manual and feature reference contain the operational instructions and endpoint
inventory.

## Architecture and payment boundaries

Prisma/PostgreSQL remains the system of record. Merchant billing and shopper
orders use separate payment contexts and authorization checks:

- SaaS billing collects setup fees, invoices, renewals, and add-ons for Nurava
  HubStores. The platform controls its own payment destinations in
  `/platform/billing`.
- Shopper payments belong to a specific merchant tenant and its orders. The
  merchant controls that store's payment route in `/manage/payments`.
- Tenant IDs and destination choices are resolved and checked server-side.
  Prisma and payment-provider credentials remain on the server; credentials are
  not returned to browser clients.
- Merchant-routed product sales carry zero Nurava product commission. Manual
  phone receipts do not confirm an order until an authorized merchant staff
  member verifies the receipt.

## Platform SaaS collection

The platform may independently enable a PayBill, Till, and registered phone
option. At most one current destination of each type is active; saving a new
destination replaces the active version for that type while leaving other types
available. A platform owner or Super Admin can configure or disable each type
and review manual phone receipts. A merchant chooses from the platform options
currently available when initiating a setup-fee or invoice payment.

- **PayBill/Till:** Uses the server-side Daraja consumer key and consumer
  secret. The destination passkey is encrypted when stored. The existing
  environment-configured PayBill can serve as a fallback where no database
  PayBill destination overrides it. STK payments settle through provider
  verification/callback handling.
- **Registered phone:** Uses manual Send Money and does not use Daraja STK
  credentials. A merchant submits the receipt code; a platform owner or Super
  Admin verifies it against the account statement before the payment is settled
  and the associated billing state changes.
- **Selection/versioning:** The payment request records its destination type
  and version. An active pending payment is protected from being silently
  switched to another option; a conflicting choice is rejected until the
  existing attempt is resolved.

Environment credentials and database destinations must stay isolated between
staging and production. Do not place private provider credentials in the
frontend or Android bundle.

## Merchant shopper payments

Each merchant configures one shopper-payment route for its store:

- **PayBill/Till:** The merchant supplies the business number, account name,
  and its own Daraja consumer key, consumer secret, and STK passkey. Credentials
  are encrypted and tenant-scoped. A successful STK flow is confirmed by
  provider verification/callback handling.
- **Registered M-Pesa phone:** The merchant supplies the registered phone and
  account name. The route is stored as manual phone transfer and does not ask
  for Daraja credentials. The shopper sends the exact amount, submits the M-Pesa
  receipt code, and waits while an authorized store staff member verifies it.
  Receipt review is tenant-scoped; an approved receipt confirms the pending
  order. A rejected receipt leaves the shopper able to retry.

Changing the account type clears the number field in the merchant settings UI,
preventing a PayBill/Till value from being reused as a phone number or the
reverse. Under strict merchant verification mode, the existing verification
gate also applies to the phone route. Under the default light onboarding mode,
the route is merchant-declared; the system does not claim independent ownership
verification.

`MERCHANT_DIRECT` remains the contact-only checkout mode. It does not initiate
shopper payment requests. SaaS billing is independent of this shopper-commerce
setting.

## Database and migration state

- `0037_platform_mpesa_destination` added versioned platform destination
  records and the allowed destination types.
- `0038_merchant_phone_shopper_payments` added `PHONE` as a merchant settlement
  account type for manual shopper transfers.
- `0039_platform_mpesa_destination_options` added per-destination active state
  and an index used to retrieve the active destination by type and version.
- Staging status was checked after applying 0039 and reported all migrations
  applied. Production migration state has not been established by this record.
- Apply additive migrations before deploying source that depends on them.
  Avoid schema reset or `db push`; retain migration history and back up the
  intended database before a production rollout.

No database credential, payment secret, signing key, or environment value is
stored in this document.

## Authorization and operational checks

- Merchant shopper-payment settings require owner/admin store permissions.
- Shopper order lookup, payment initiation, receipt submission, and receipt
  review are scoped to the resolved tenant and relevant order/payment.
- Platform collection changes and manual billing-receipt review require a
  Super Admin or Platform Owner. Other platform administrators can access
  permitted billing views but cannot mutate collection settings.
- M-Pesa PINs are never requested or stored.
- A receipt submission is not payment confirmation. Billing or order state
  changes only after the corresponding authorized review succeeds.
- Staging and production databases, Daraja modes, and deployment credentials
  must be verified separately before release.

## Remaining rollout verification

Source and database state alone do not verify the external payment path. Before
claiming production readiness, verify with approved staging accounts and
provider configuration:

1. PayBill and Till STK initiation, callback/query settlement, and the expected
   invoice/order update.
2. Platform phone-transfer receipt submit, approve, and reject behavior.
3. Merchant phone-transfer receipt submit, approve, reject, retry, and
   tenant-isolation behavior.
4. Destination switching and disabling when multiple platform types are
   active, including the legacy environment PayBill fallback.
5. Authentication, authorization, audit records, duplicate receipt handling,
   and merchant billing/setup-fee lifecycle results.
6. Production database migration status and provider configuration, only as a
   separately approved production rollout.

Do not interpret a successful STK prompt as settlement; require the verified
provider result. Do not treat staging verification as production verification.
