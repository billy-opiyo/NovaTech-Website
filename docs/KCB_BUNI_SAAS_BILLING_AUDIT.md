# KCB BUNI SaaS billing integration audit

**Audit date:** 2026-10-07  
**Branch:** `saas-staging`  
**Scope:** Source and configuration audit only. No application source, schema, migration, or environment files were changed.

## Decision

The repository has a distinct SaaS billing domain that can host a BUNI adapter, while leaving shopper commerce on its existing merchant-routed M-Pesa path. The newly supplied files and portal screenshots confirm the M-Pesa Express/STK initiation contract. The integration is still **not implemented** because the materials do not specify how BUNI authenticates its callback or how to verify a transaction with BUNI before marking an invoice paid. The user instructions explicitly prohibit guessing those details.

KCB's public BUNI pages confirm mobile-money collection and a Receive Payments API category. The public getting-started guide documents the UAT token request at `https://uat.buni.kcbgroup.com/token`, using Basic authorization and a form-encoded `grant_type=client_credentials`, and describes creating an application, subscribing it to an API, OAuth, and sandbox testing. It does not publish the needed Receive Payments operation schema. I followed the official Docs link to `https://sandbox.buni.kcbgroup.com/devportal/apis`; the public page fetch returned no documentation content, and the authenticated project search found no Transaction Query API spec in the current worktree. BUNI's FAQ says to contact them with a brief use case if the desired API cannot be located, and says production credentials are requested after sandbox testing. Its public [Contact Us form](https://buni.kcbgroup.com/contact-us) is one official route. See [BUNI Receive Payments overview](https://buni.kcbgroup.com/discover-apis), [BUNI getting started](https://buni.kcbgroup.com/getting-started), and [BUNI FAQ](https://buni.kcbgroup.com/faqs/).

The project-root files added on 2026-10-07 provide portal-specific STK details. `KCB MPESA STK PUSH API SPECIFICATION DOCUMENT (1).pdf` and `Mpesa Express.postman_collection.json` identify the UAT service base URL and STK request, and include accepted-response and callback examples. The screenshot set shows the portal API name/version (`MpesaExpressAPIService`, v1.0.0), its STK Push description, and the Try Out schema. These are treated as API evidence, not as instructions to run requests or as production configuration.

Additional portal screenshots show `InstantPaymentNotification` v1.0.0 in the Notification category, with UAT base `https://uat.buni.kcbgroup.com/ipn/1.0.0`. Its Documents tab lists an OpenAPI definition, a brief, `IPN-WithValidation` (described for OTC and Agency payment channels), `IPN-Till` (payments made to a KCB Till), `IPN-Account`, and a `RequestLetter` required for go-live. A subsequent screenshot with `Transaction_Services` selected displays **“No APIs Available.”** Thus Transaction Query is not currently visible in the user's portal catalogue under that category. These IPN documents may cover separate payment-notification channels; they do not by themselves establish a status-query or authenticity mechanism for the M-Pesa Express STK callback.

The latest portal screenshot shows that the bottom-right panel is the experimental **API Marketplace Assistant** and its message box is disabled until a token is provided. It is not usable as an unauthenticated support-message form. BUNI's public FAQ directs users to contact BUNI with a brief use case when an API is unavailable; the public Contact Us page and Getting Started support link are available without using this assistant. The portal's RequestLetter card identifies `buni@kcbgroup.com` as the destination for the signed go-live letter; that address is documented for the letter submission.

`KCB Till Notification Documentation.pdf` includes a sample IPN request with a `signature` header and payment fields such as `transactionID`, `transactionAmt`, `transactionDate`, `debitMSISDN`, and bill reference. `IPN Account Notification Documentation.pdf` is now reviewed: it specifies HTTPS POST with JSON, a `Signature` header, and notification fields including `transactionReference`, `requestId`, `channelCode`, `timestamp`, `transactionAmount`, `currency`, `customerReference`, `customerName`, `customerMobileNumber`, `narration`, `creditAccountIdentifier`, `organizationShortCode`, and `tillNumber`. Its sample response acknowledges receipt with `transactionID`, `statusCode`, and `statusMessage`. Neither document explains how to verify the signature, provision the verification key/secret, or whether M-Pesa Express STK payments to this account generate either IPN. `Validation & Notification Documentation.pdf` describes validation and payment-notification payloads for the OTC/agency use case; it is not a Transaction Query/status API.

## 1. Current architecture

- The repository is a Next.js 15 App Router application (`frontend/`) with shared server-side TypeScript and Prisma code (`backend/`). PostgreSQL is the system of record.
- Auth.js sessions identify users. `resolveTenantFromRequest()` derives the tenant from the request, and membership/permission guards protect merchant billing actions. Platform billing uses platform-role checks.
- The Prisma schema contains `Tenant`, `Membership`, `Subscription`, `BillingCustomer`, `BillingRecord`, `Invoice`, `Payment`, and `WebhookReceipt` models. Migrations are under `backend/prisma/migrations/`; the repository has no BUNI migration or BUNI-specific code/configuration.
- The scheduled lifecycle route is `frontend/src/app/api/cron/lifecycle/route.ts`, scheduled daily by `vercel.json`. It handles subscription lifecycle/reminders/retention, not payment-provider polling.

## 2. Current SaaS billing flow

- Onboarding creates the tenant, store, owner membership, subscription, billing customer, and setup-fee billing record in `frontend/src/app/api/onboarding/store/route.ts`. A required setup fee leaves the subscription `INCOMPLETE` and the tenant does not begin the pilot until paid.
- Merchant actions are handled by `frontend/src/app/api/manage/billing/route.ts`. `setup_mpesa` and `renew_mpesa` call `createSetupFeeMpesaPayment` and `createMpesaInvoicePayment` in `backend/billing/service.ts`.
- Those service functions create/reuse an open invoice and pending payment record, then invoke `initiateMpesaPayment` from `backend/payments/mpesa/index.ts`. With no merchant credentials passed, it uses the platform Daraja environment variables and Safaricom STK API.
- The merchant screen is `frontend/src/app/manage/billing/page.tsx`. It currently asks for a phone number and displays a configured Nurava Tech PayBill value. The phone is not currently prefilled from a saved billing phone in this screen.
- The callback is the shared Daraja endpoint `frontend/src/app/api/payments/webhooks/mpesa/stk-callback/route.ts`. `backend/payments/webhooks/index.ts` identifies a payment by provider reference, queries Daraja for successful STK callbacks when configured, updates the payment, and dispatches non-order payments to `markBillingPaymentFromMpesa`.
- Setup-fee success marks the billing record paid, changes the incomplete subscription to trialing, and starts the trial. Renewal success marks an invoice paid and activates/extends the subscription. Existing plan, VAT, credits, grace-period, and manual-renewal rules live in `backend/billing/service.ts`, `backend/billing/policy.ts`, and `backend/billing/lifecycle.ts`.
- `frontend/src/app/api/platform/billing/route.ts`, `frontend/src/app/platform/billing/page.tsx`, and the manage billing snapshot provide administrative and merchant views.

## 3. Current commerce payment flow

- Product checkout and order creation use `frontend/src/app/checkout/page.tsx`, `frontend/src/app/api/orders/route.ts`, and order/cart services under `backend/services/`.
- When shopper checkout is enabled, `frontend/src/app/api/payments/mpesa/initiate/route.ts` verifies the order belongs to the resolved tenant and shopper, checks payable status and amount, retrieves that tenant's merchant M-Pesa credentials, and starts STK.
- The route passes the merchant config to the shared Daraja helper. The resulting `Payment` has `kind: ORDER` and an `orderId`; this is the identifying boundary from SaaS invoice payments.
- The same STK callback handler routes an order payment to merchant-specific Daraja verification, then the order confirmation path. It does not invoke SaaS billing settlement for `kind: ORDER`. Commerce verification also lives at `frontend/src/app/api/payments/mpesa/verify/route.ts` and is explicitly constrained to `kind: ORDER` with an order ID.
- Order payment finalization updates order status with a pending-state claim and invokes order-specific confirmation behavior. Shopper M-Pesa configuration is stored tenant-scoped in `MerchantShopperPaymentProfile`; it is independent from platform billing credentials.

## 4. Existing M-Pesa implementation

- `backend/lib/daraja.ts` implements Safaricom Daraja OAuth token caching, STK Push, STK query, phone normalization, and platform/merchant configuration.
- `backend/payments/mpesa/index.ts` creates and verifies `Payment` records for both the SaaS billing caller and commerce caller; callers distinguish them with `kind`, invoice/subscription fields, and optional merchant credentials.
- `backend/payments/merchant-mpesa.ts` loads tenant-scoped commerce credentials. `backend/payments/webhooks/index.ts` handles Daraja STK and C2B notifications, and `frontend/src/app/api/payments/webhooks/mpesa/c2b/route.ts` exposes C2B.
- `MPESA_*` environment names are present in `.env.example`; no `KCB_BUNI_*` names or values exist in the tracked configuration/docs. Secret values were not read into this report.
- Existing relevant tests include `tests/payments/mpesa.test.ts`, `tests/payments/mpesa-payment.test.ts`, `tests/billing/subscription.test.ts`, and shopper payment tests. There are no BUNI initiation, settlement, or payment-isolation tests.

## 4a. Supplied BUNI M-Pesa Express contract

- Service: `MpesaExpressAPIService`, version `1.0.0`; the portal describes it as triggering the M-Pesa STK Push.
- UAT base URL: `https://uat.buni.kcbgroup.com/mm/api/request/1.0.0`; operation shown is `POST /stkpush`.
- The portal schema shows required headers `routeCode`, `operation`, and `messageId`; the example values include route code `207` and operation `STKPush`. The allowed message ID format/generation rules are not specified in the supplied excerpts.
- The Postman collection documents a token request to `https://uat.buni.kcbgroup.com/token?grant_type=client_credentials` using Basic auth and shows a bearer authorization on the STK request. Do not reuse the literal credentials/token in the supplied examples.
- The request example includes `phoneNumber`, string `amount`, `invoiceNumber`, `sharedShortCode`, `orgShortCode`, `orgPassKey`, `callbackUrl`, and `transactionDescription`. Example values do not establish how KCB account/till routing fields should be populated for Nurava Tech.
- The PDF shows an accepted response with an outer `header` status and inner `response` carrying `MerchantRequestID`, `ResponseCode`, `CustomerMessage`, and `CheckoutRequestID`. An accepted request is pending authorization; it is not evidence that payment succeeded.
- The PDF includes a callback example shaped as `Body.stkCallback`, with `MerchantRequestID`, `CheckoutRequestID`, `ResultCode`, `ResultDesc`, and optional `CallbackMetadata.Item` values including amount, receipt, transaction date, and phone. It includes success and failure examples. The material does not state callback authentication/signature requirements or show a BUNI transaction-status query contract.
- The STK callback example is distinct from the Till and Account IPN samples, which each show a signature header. The Account IPN includes a `customerReference` field that could potentially carry a billing reference, but the docs do not confirm it is populated from STK `invoiceNumber` or that STK produces this IPN. No supplied material documents signature validation or a BUNI transaction-status query contract.
- The supplied Postman collection contains a static bearer token and the PDF contains a Basic Authorization example. Values are intentionally omitted from this report. Treat these as exposed credentials: revoke/regenerate any live credentials and sanitize the files before committing them. All three new root files are currently untracked.

## 5. Prisma payment-related models

- `Payment` is a shared record with nullable `orderId`, `invoiceId`, `subscriptionId`, and `billingRecordId`; its `kind` enum distinguishes `ORDER`, `SETUP_FEE`, `SUBSCRIPTION`, `ADDON`, and `RENEWAL`. It stores provider, amount, currency, status, globally unique `providerReference`, phone, failure data, metadata, and timestamps.
- `Invoice` is tenant-scoped, optionally related to a subscription, and tracks kind, provider, totals/currency, status, and `paidAt`.
- `BillingRecord` separately tracks the tenant setup-fee amount/status and `setupFeePaidAt`; `BillingCustomer` has a nullable M-Pesa phone field.
- `WebhookReceipt` uses a unique `(provider, eventId)` key and processing state for providers that supply event IDs. Whether BUNI sends a stable event ID and what constitutes a safe receipt key is not known from the public API summary.
- Tenant consistency constraints have migration support in `0021_tenant_consistency_triggers`. BUNI should continue using tenant-derived invoice/payment ownership and must not touch `Order`, order items, or inventory.

## 6. Files likely to need modification after the provider contract is supplied

- `backend/payments/saas/kcb-buni/` (new isolated client/config/contract adapter, location adjustable to local conventions).
- `backend/billing/service.ts` (route SaaS initiation through the provider boundary; keep invoice and subscription rules).
- `frontend/src/app/api/manage/billing/route.ts` and `frontend/src/app/manage/billing/page.tsx` (feature-flagged M-Pesa billing option, phone confirmation, pending/success state, and provider status refresh if supported).
- A dedicated `frontend/src/app/api/billing/payments/kcb-buni/callback/route.ts` and isolated BUNI callback/verification service.
- `frontend/src/app/api/platform/billing/route.ts` and `frontend/src/app/platform/billing/page.tsx` (provider/reference/completion metadata if the existing view needs it).
- `.env.example` and a developer guide for confirmed BUNI-specific configuration.
- A backward-compatible Prisma migration only if the exact provider contract cannot be represented safely using the existing `Payment`, `Invoice`, and `WebhookReceipt` fields/constraints. The need and exact columns/indexes cannot be decided responsibly until the provider references, notification identity, and verification fields are known.
- Focused billing, callback, idempotency, and commerce-isolation tests.

## 7. Files that must remain outside the BUNI change

- Commerce STK initiation and verification: `frontend/src/app/api/payments/mpesa/initiate/route.ts`, `frontend/src/app/api/payments/mpesa/verify/route.ts`.
- Merchant credential resolution and existing Daraja implementation: `backend/payments/merchant-mpesa.ts`, `backend/lib/daraja.ts` (except a separately justified shared-infrastructure fix, which is not currently indicated).
- Commerce callback/order transitions: `frontend/src/app/api/payments/webhooks/mpesa/stk-callback/route.ts`, `frontend/src/app/api/payments/webhooks/mpesa/c2b/route.ts`, the order payment portions of `backend/payments/webhooks/index.ts`, `backend/services/order.service.ts`, checkout/cart/order UI and APIs.

## 8. Proposed BUNI architecture

`Manage Billing -> authenticated tenant billing API -> SaaS billing service -> KCB BUNI adapter -> documented Receive Payments operation -> dedicated BUNI notification/verification endpoint -> one idempotent database settlement operation -> existing Invoice/BillingRecord/Subscription lifecycle`.

The route should be unavailable unless `KCB_BUNI_ENABLED` is explicitly true and the confirmed environment-specific configuration is complete. The provider adapter must fail closed when disabled or incomplete. The browser must receive only safe pending/payment status data. Commerce remains on its existing merchant-routed Daraja routes and cannot call or be settled by the BUNI endpoint.

## 9. Risks and open requirements

The supplied portal docs establish M-Pesa Express/STK initiation in UAT. Production endpoint/credentials, token lifetime/scopes, rules for generating unique message IDs, supported phone format, and the account-specific settlement identifiers remain unverified. The Till and Account IPN specs show signature headers, but neither provides the validation algorithm/key provisioning or confirms applicability to STK Express. The Account IPN's `customerReference` may offer a correlation field only if KCB confirms that mapping. No Transaction Query API contract is included. The letter template lists IPN and Transaction Query as possible API products to request, but it is not evidence that those APIs are subscribed or documents their contracts.

The supplied `Partner Request Letter for Buni API Integration_v2026.docx` is a production setup/modify/cancel request template addressed to the KCB Branch Manager and says to submit it following successful testing. It asks for account or till type, account/till name and number, branch, currency, the required API products (including IPN, MPESA Express, and Transaction Query), the authorized integration provider/person, and signatures from authorized account/till signatories. These values and signatures are account-specific and should be completed by the account holder through KCB's official process; the template is not an API contract or proof that a product is already provisioned.

The requested settlement to the user's KCB account also depends on the KCB/VOOMA account and merchant/account settlement configuration, including any required PayBill/account identifiers, callback registration, limits, fees, production approval, and KYC. A PayBill number alone is not enough evidence to configure the BUNI request safely. No such values were present in repository config, and no account credentials or portal export were supplied.

There is an existing idempotency improvement opportunity independent of provider choice: `markBillingPaymentFromMpesa` changes invoice/payment-related records and subscription state through multiple operations rather than one database transaction. This needs a transaction/claim design during implementation so a repeated or concurrent BUNI notification cannot extend a period twice. The current provider callback handler is Daraja-specific and must not be reused as a BUNI callback parser.

## 10. Migration requirements

- Do not reset, push, or destructively alter the database. Preserve all current payment/order history.
- Existing `Payment.kind`, invoice links, unique provider reference, and webhook receipt table may be sufficient if BUNI gives a stable provider transaction reference and event identity; that cannot yet be confirmed.
- After receiving the exact contract, decide whether a migration is needed for provider/domain identification, idempotency keys, callback event identity, completion timestamp, and tenant-consistency constraints. Any migration must be additive, nullable/defaulted for existing rows, and tested against a migrated copy of existing schema/data.
- No migration was authored because there is not yet an evidence-based BUNI reference/callback model to encode.

## Required handoff to resume implementation

Provide the BUNI portal documentation for the subscribed **Transaction Query** API or confirmation of the supported way to verify an STK transaction. Also provide the Till/Account IPN signature verification procedure and required key/certificate provisioning, and confirmation whether M-Pesa Express STK payments to this account produce those IPNs. If Account IPN applies, confirm whether its `customerReference` is populated from STK `invoiceNumber` (or how to correlate the two). Confirm the exact account/till routing configuration. Do not send client secrets, bearer tokens, or production credentials in chat; configure them only in the server-side environment. Revoke/regenerate any live credential material embedded in the supplied Postman/PDF files before using or committing those files.

### Suggested question for KCB BUNI support

> We have subscribed to `MpesaExpressAPIService` v1.0.0 and can initiate an STK request in UAT. Please provide the current Transaction Query API specification or confirm the supported way to verify an STK payment using its `CheckoutRequestID` or `MerchantRequestID`. The Till and Account IPN documentation show a `Signature` header: please provide the exact signature verification algorithm and public key/secret provisioning process, and confirm whether an M-Pesa Express STK payment to our KCB account generates either IPN or another authenticated callback. For Account IPN, please confirm whether `customerReference` receives the STK `invoiceNumber` (or specify the correlation field), along with acknowledgement/retry behavior. Also confirm the exact meaning/required values for `sharedShortCode`, `orgShortCode`, `orgPassKey`, and `messageId` for our KCB account/till, supported currency and phone format, and required UAT/production API subscriptions. We will provide credentials through the approved secure channel, not in this email or chat.

For the first support request, send this brief use case and the verification questions above through the BUNI [Contact Us form](https://buni.kcbgroup.com/contact-us) if Transaction Query is absent from the signed-in catalogue. Do not include client secrets, bearer tokens, or `orgPassKey` values.
