# Project Bug Audit

Status: cycle 26 repairs in progress; 49 prior findings verified; 30 current-cycle entries recorded, including two verified false positives
Audit started: 2026-10-08; boutique-inclusive transfer audit: 2026-10-09
Repository: NovaTech Website
Branch: saas-staging

This file is the source of truth for the project-wide audit and repair cycle. Findings are recorded before their fixes begin; the authoritative status register below records current statuses (`Pending`, `In Progress`, `Fixed`, or `Verified`). Historical cycle summaries retain the statuses and evidence that applied at the time.

## Scope and evidence limits

- Repository source, configuration, migrations, documentation, automated tests, and available local runtime are in scope.
- A passing source check does not prove a live Neon database, payment provider, email/SMS/WhatsApp provider, scheduler, backup, DNS, or production deployment.
- Browser findings will identify the exact URL, viewport, console/network evidence, and whether the result was locally reproducible.
- Application repairs were performed only after the pre-repair issue report was frozen below.

## Fresh full audit cycle 14 — 2026-10-08 (pre-repair)

This independent audit began on a clean `saas-staging` worktree at `2d2f8f8`. The repository inventory covers 531 non-ignored files and 98 API route files. Source review rechecked the full application, service/controller, Prisma/migration, security, multi-industry, billing/payment, user-flow, test, and documentation surfaces. The later cycle 15 boutique-inclusive changes are tracked separately below.

### Newly confirmed finding (recorded before repair)

#### BUG-050 — Payment and pending-order cancellation can race into inconsistent payment, order, and inventory state

- **File paths:** `backend/payments/mpesa/index.ts`, `backend/payments/cards/index.ts`, `backend/payments/webhooks/index.ts`, `backend/services/order.service.ts`
- **Description:** Successful verification/webhook paths can persist a payment as `COMPLETED` before a conditional pending-order claim. If cancellation wins that claim, the payment may remain completed while the endpoint reports failure and the order is cancelled. A second race remains in `finalizePendingOrderPayment`: it reads the order status before the conditional claim and decides whether refund review is required from that potentially stale snapshot. If cancellation commits after the read but before the claim, the claim returns zero while the stale status is still `PENDING`; the payment is marked only `REVIEW_REQUIRED` rather than explicitly `REFUND_REQUIRED_ORDER_CANCELLED`. Conversely, `cancelPendingOrder` must atomically claim `PENDING` before restoring inventory so it cannot race with a confirmation.
- **Root cause:** Payment state, order transition, and stock restoration are not reconciled in a single transaction with a guarded legal state transition; the pending-cancellation helper has a read-then-unconditional-write window.
- **Recommended fix:** Reconcile payment/order/commission state transactionally or with durable, retry-safe compensation; use conditional state transitions before restoring stock; after a failed settlement claim, re-read the order inside the transaction and classify the actual terminal state. Add concurrent success-vs-cancel regression coverage for both stock and payment state.
- **Severity:** High
- **Status:** In Progress — completion/cancellation now use conditional transactional transitions and late payment is marked for refund review; live DB concurrency remains unverified.

#### BUG-051 — Order idempotency-key replay can disclose another shopper's order and shipping details

- **File paths:** `backend/controllers/orderController.ts`, `backend/services/order.service.ts`
- **Description:** `POST /api/orders` accepts a caller-controlled `Idempotency-Key`. When a matching key already exists in the same tenant, `createOrder` returns that order before comparing its `userId`, guest email, or request payload. The controller returns the full order to the caller, including the shipping-address PII. An unauthenticated guest can replay a key if learned or reused and receive another shopper's order response.
- **Root cause:** Idempotency-key lookup is tenant-scoped but is treated as authorization; the replay path does not bind the key to the authenticated user/guest identity or verify the order owner before returning it.
- **Recommended fix:** Bind order idempotency to a normalized authenticated-user or guest identity, reject replay by a different owner, and ensure the replay response only returns an order the caller is authorized to see. Add guest and authenticated cross-owner replay tests.
- **Severity:** High
- **Status:** Fixed — the persisted key is now a digest of tenant, normalized owner scope, client key, and the complete canonical validated checkout payload. Exact retries resolve to the same order while changed payloads cannot replay an order created from different details; the digest stores no raw checkout PII. Regression tests cover payload changes and tenant/owner/key isolation. No schema migration is required.

#### BUG-052 — Card payment intent accepts a caller-selected currency for an existing order

- **File paths:** `frontend/src/app/api/payments/card/create-intent/route.ts`, `backend/payments/cards/index.ts`, `backend/prisma/schema.prisma` (`Store.currency`)
- **Description:** The public card-intent schema accepts any three-character currency. For an order, the service checks only that the numeric amount equals `Order.total`; it does not bind the requested currency to the resolved store's currency. The resulting Stripe intent is then associated with the order and successful verification can confirm it, allowing a different currency/value basis to settle a store-priced order.
- **Root cause:** Order currency is not carried into the order/payment contract, and card intent validation treats amount equality as sufficient while trusting the caller's currency.
- **Recommended fix:** Derive currency server-side from the store/order, reject caller mismatches, and use a tested currency-minor-unit conversion for Stripe amount construction. Ensure verification/webhook reconciliation checks provider amount/currency against the persisted payment contract before finalizing an order.
- **Severity:** High
- **Status:** In Progress — order intents are KES/store-bound and provider amount/currency are checked; provider-backed database tests remain unavailable.

#### BUG-053 — Card payment can be attached to an order that did not select card payment

- **File paths:** `frontend/src/app/api/payments/card/create-intent/route.ts`, `backend/payments/cards/index.ts`, `backend/validators/orderValidator.ts`
- **Description:** When `orderId` is supplied, the card route checks tenant and shopper identity, and the service checks that the order is pending and the amount matches, but neither checks the order's `paymentMethod`. Meanwhile the order validator only permits `MPESA` and `PAY_ON_DELIVERY`. Thus a Stripe payment may complete an order whose stored method says M-Pesa or pay-on-delivery, bypassing the method selected by the shopper and leaving order/payment reporting inconsistent.
- **Root cause:** Card-intent eligibility is not integrated with the order payment-method state machine; payment-method validation and provider initiation use separate contracts.
- **Recommended fix:** Add a single explicit allowed-method contract (including CARD only if shopper card payments are intended), enforce it at order creation and provider initiation/verification, and reject card intents for orders with another method. Add tests for every allowed and rejected method.
- **Severity:** Medium
- **Status:** Fixed — the order and service boundaries require the selected CARD method.

#### BUG-054 — Checkout generates a new idempotency key for every order attempt

- **File path:** `frontend/src/app/checkout/page.tsx`
- **Description:** `createOrder()` calls `crypto.randomUUID()` while constructing every POST. A retry after a timeout/reload or another invocation therefore uses a new key, so the backend cannot recognize the request as a retry and may create a second order/reserve stock again. The server-side idempotency mechanism is not effective for normal checkout retries.
- **Root cause:** The key is generated per request rather than once per logical checkout and retained across retry attempts until the order result is known.
- **Recommended fix:** Create and retain an idempotency key per checkout submission (scoped to the cart/request), reuse it for network retries, clear it only after a confirmed response or cart change, and test duplicate retry behavior.
- **Severity:** Medium
- **Status:** Fixed — a PII-free SHA-256 payload fingerprint indexes a session-persisted retry key, cleared after success.

#### BUG-055 — Card verification retrieves a caller-supplied Stripe intent when no local tenant payment matches

- **File paths:** `backend/payments/cards/index.ts`, `frontend/src/app/api/payments/card/verify/route.ts`
- **Description:** When the tenant-scoped payment lookup returns no row, `verifyCardPayment` uses the caller's `reference` directly as a Stripe PaymentIntent ID and returns provider status, amount, currency, and receipt email. This permits cross-tenant/payment-reference probing and leaks transaction metadata for any known Stripe intent. The local lookup also omits a `provider: "stripe"` predicate.
- **Root cause:** Provider lookup and ownership validation are optional; external provider retrieval is performed before proving that the reference belongs to a Stripe payment in the resolved tenant.
- **Recommended fix:** Require a local payment row scoped by tenant and Stripe provider before contacting Stripe; return a uniform not-found response otherwise. Never retrieve an untrusted provider ID from the public request, and test cross-tenant and cross-provider references.
- **Severity:** High
- **Status:** Fixed — Stripe verification requires an owned tenant/provider payment and shopper authorization, and omits receipt email.

#### BUG-056 — M-Pesa verification can select and mutate another provider's payment row

- **File paths:** `backend/payments/mpesa/index.ts`, `frontend/src/app/api/payments/mpesa/verify/route.ts`
- **Description:** The M-Pesa route accepts a tenant payment with `kind === ORDER` without checking its provider, and `verifyMpesaPayment` looks up by provider reference or metadata reference without `provider: "mpesa"`. It can query Daraja using a non-M-Pesa reference and write the returned status onto that unrelated payment record.
- **Root cause:** Payment verification uses a tenant/reference match as the full identity and does not include the provider discriminator in the preflight and service queries.
- **Recommended fix:** Require the M-Pesa provider at the route boundary and in every service lookup/update; bind payment/provider/order/tenant together and reject mismatches before provider calls. Add cross-provider collision tests.
- **Severity:** High
- **Status:** Fixed — route and service lookups require the M-Pesa provider discriminator.

## Fresh full audit cycle 15 — 2026-10-09 (four-industry and transfer verification)

This pass includes electronics, cakes, furniture, and boutiques as merchant-creatable industries. It rechecked onboarding, industry attributes, boutique catalog/support copy, compare rows, product/category imagery, demo seeding and admin ownership, shared storefront context, payment/order state, billing currency, authentication/tenant boundaries, and regression tests. The initial source pass was mistakenly run on `multi-industry-commerce`; at the user's direction its uncommitted source edits were transferred to the clean `saas-staging` branch via a recoverable stash. The application edits remain uncommitted and unstaged, no push or deployment occurred, and no database operation was run. The only document conflict was resolved by retaining this branch's audit history and adding cycle 15 below.

### Additional findings recorded before repair

#### BUG-057 — Industry-aware product-image call sites (reviewed false positive)

- **Files:** `frontend/src/constants/productImages.ts` and four product image consumers.
- **Description:** The initial scan flagged helper usage in deals, compare, wishlist, and dashboard top products; tracing confirmed each wrapper supplies the active store industry.
- **Severity:** Medium
- **Status:** Verified — no defect.

#### BUG-058 — Boutique shopper-facing copy was generic

- **Files:** `frontend/src/lib/industry-copy.ts`, `frontend/src/app/contact/page.tsx`, `frontend/src/app/faqs/page.tsx`.
- **Description:** Boutique product search, enquiry, support, contact, and FAQ content did not consistently guide shoppers on clothing, fit, sizes, colours, and materials.
- **Severity:** Low
- **Status:** Fixed — boutique-specific copy and regression coverage are present.

#### BUG-059 — Boutique product comparisons inherited electronics specification labels

- **File:** `frontend/src/app/compare/page.tsx`.
- **Description:** Boutique comparison rows could expose processor/RAM/camera labels instead of style and fit attributes.
- **Severity:** Medium
- **Status:** Fixed — comparison rows are selected by industry, with a neutral unknown-industry fallback.

#### BUG-060 — Stripe billing accepted currencies the current billing display/reconciliation cannot safely support

- **Files:** `backend/billing/service.ts`, `frontend/src/app/api/platform/billing/route.ts`.
- **Description:** Non-KES billing currencies could be converted and reconciled using incompatible minor-unit assumptions.
- **Severity:** High
- **Status:** In Progress — billing input and Stripe price configuration are constrained to KES; live Stripe price/webhook validation remains.

#### BUG-061 — Stripe intent replay could return a client secret for a different same-tenant order

- **File:** `backend/payments/cards/index.ts`.
- **Description:** Existing intent replay did not consistently bind the saved payment to the requested order and amount contract.
- **Severity:** High
- **Status:** Fixed — replay checks order, amount, and currency and rejects a mismatch.

#### BUG-062 — Onboarding hid industry API failures behind an electronics-only fallback

- **File:** `frontend/src/app/onboarding/page.tsx`.
- **Description:** Failed industry loading could mislead merchants into seeing electronics as the only supported choice.
- **Severity:** Medium
- **Status:** Fixed — loading failures are surfaced and cannot submit an unverified industry choice.

#### BUG-063 — Pending Stripe verification could cancel an order

- **Files:** `backend/payments/cards/index.ts`, `frontend/src/app/api/payments/card/verify/route.ts`.
- **Description:** A non-terminal pending provider status could previously trigger order cancellation without shopper ownership validation.
- **Severity:** High
- **Status:** Fixed — only terminal failures cancel, and verification requires the local tenant/provider payment and order owner.

#### BUG-064 — Store onboarding accepted currencies unsupported by the current storefront

- **File:** `backend/validators/storeValidator.ts`.
- **Description:** A non-KES currency could be accepted despite product, cart, and checkout surfaces currently formatting and settling KES.
- **Severity:** Medium
- **Status:** Fixed — new stores are restricted to normalized KES until dynamic currency support is implemented.

#### BUG-065 — Boutique demo WhatsApp fallback scope (reviewed false positive)

- **Files:** `frontend/src/lib/demo-store-config.ts`, `frontend/src/lib/store-context.server.ts`, `tests/industry/industry-storefronts.test.ts`.
- **Description:** The initial review questioned whether boutique should share the demo WhatsApp number. The user has explicitly confirmed the boutique demo should use that same approved number.
- **Severity:** Medium
- **Status:** Verified — no defect; regression coverage asserts all three industry demo slugs resolve to the configured shared number.

## Fresh full audit cycle 11 — 2026-10-08 (pre-repair)

This is a new source audit of the current `saas-staging` tree after the multi-industry, demo-store, and platform UI refactors. No application source fixes have started in this cycle. The review rechecked industry selection and defaults, tenant/store catalog context, dynamic attribute validation and storage, onboarding, seed idempotency, public catalog/search/product/category/deals/compare surfaces, relevant platform industry APIs, and the current unit/browser/build evidence. The earlier 42-item register is retained as historical work, but it is not treated as proof that later refactors are defect-free.

### Newly confirmed findings (recorded before repair)

#### BUG-043 — Catalog CSV import/export drops dynamic industry attributes and import bypasses required-attribute validation

- **File paths:** `frontend/src/app/api/manage/catalog/import/route.ts`, `frontend/src/app/api/manage/catalog/export/route.ts`, `backend/lib/industry.ts`
- **Description:** Catalog export omits `Product.attributeValues`; import has no attribute column/parser and writes products directly with Prisma instead of calling `validateAndNormalizeProductAttributes`. Thus CSV round-trips lose industry-specific data, and a store with required product attributes can create products through CSV without those values.
- **Root cause:** The bulk catalog path predates the dynamic industry-attribute model and does not share the product service's normalization/validation transaction.
- **Recommended fix:** Define a bounded, documented CSV representation for industry attributes; resolve definitions from the request's store industry; validate required and typed values on preview and commit; create/update product attribute values atomically; export the values in a reversible format.
- **Severity:** Medium
- **Status:** Verified

#### BUG-044 — Store catalog, cart, and contact surfaces expose warranty-only copy across industries

- **File paths:** `frontend/src/components/manage/ManageProductsPage.tsx`, `frontend/src/app/deals/page.tsx`, `frontend/src/app/cart/page.tsx`, `frontend/src/app/contact/page.tsx`
- **Description:** The product editor and deals page expose warranty copy regardless of industry. The cart unconditionally tells shoppers the merchant handles warranties, and the storefront contact form always offers a “Warranty Claim” subject. These expose electronics-oriented concepts in cake, furniture, and future storefronts despite existing industry-aware support copy.
- **Root cause:** Storefront surfaces do not consistently condition warranty controls/topics on the resolved industry or use shared industry-specific product-support copy.
- **Recommended fix:** Use industry-aware support copy on cart/deals, and only show warranty-specific controls/topics where the platform or industry supports them; keep existing stored warranty values for compatibility.
- **Severity:** Medium
- **Status:** Verified

#### BUG-045 — OTP wrong-attempt unit test mixes a fixed send time with the wall clock

- **File path:** `tests/backend/merchant-phone-otp.test.ts`
- **Description:** The test sends the OTP at `2026-10-05T09:00:00Z` but omits `now` from the wrong-code verification calls. On the current date those calls correctly return `expired`, while the assertion expects `invalid`.
- **Root cause:** The test does not use one deterministic simulated clock for the expiry and attempt-cap scenario.
- **Recommended fix:** Pass a fixed in-window `now` to each wrong-code verification call, with a separate explicit post-expiry time for the expiry assertion.
- **Severity:** Low
- **Status:** Verified

#### BUG-046 — Platform hero test asserts a removed `TrustStrip` prop

- **File path:** `tests/core/platform-design.test.ts`
- **Description:** The multi-industry platform hero regression test requires `TrustStrip isLight={isLight}`, but current `PlatformHero.tsx` correctly renders `<TrustStrip />`; this obsolete source-string assertion causes the test suite to fail.
- **Root cause:** The test was not updated after the component stopped consuming the light-mode prop.
- **Recommended fix:** Assert the current `TrustStrip` contract and the behavior actually required (presence and platform copy), not the removed prop spelling.
- **Severity:** Low
- **Status:** Verified

#### BUG-047 — Checkout browser smoke expects checkout copy instead of the protected-route sign-in gate

- **File path:** `tests/e2e/checkout.spec.ts`
- **Description:** The smoke navigates to `/checkout` without a session and expects checkout/empty-cart text. Middleware intentionally protects `/checkout`; the browser displays the sign-in dialog with a callback to `/checkout`, so the current assertion fails even though route protection is active.
- **Root cause:** The smoke's expected state does not account for the unauthenticated route contract.
- **Recommended fix:** Assert the sign-in gate and preserved checkout callback for the unauthenticated smoke; keep checkout form/payment flow assertions in a separately authenticated test when safe seeded credentials are available.
- **Severity:** Low
- **Status:** Verified

#### BUG-048 — Historical audit summary and issue register contradict current source evidence

- **File paths:** `BUG_AUDIT.md`, `FINAL_AUDIT_REPORT.md`
- **Description:** The header still identifies this as cycle 7 on `main`, while the final report claims all 42 issues are verified and the register still marks BUG-016 pending. Current `schema.prisma` includes tenant-scoped category/product/variant unique constraints and migration 0022 is present. The old metadata/status makes the audit register unreliable for the active `saas-staging` audit.
- **Root cause:** Historical audit results were appended without refreshing the current-cycle metadata and reconciling the BUG-016 status.
- **Recommended fix:** Preserve historical cycle notes, add a dated current-cycle section, correct the current BUG-016 status using source evidence, and publish a fresh final report only after this cycle's repairs and gates complete.
- **Severity:** Low
- **Status:** Verified

#### BUG-049 — Catalog CSV export does not neutralize spreadsheet formula cells

- **File paths:** `backend/lib/catalog-csv.ts`, `frontend/src/app/api/manage/catalog/export/route.ts`
- **Description:** Catalog export encodes delimiters/quotes but leaves user-controlled cells beginning with `=`, `+`, `-`, or `@` unchanged. A merchant or imported catalog value can therefore be interpreted as a formula by spreadsheet software when an administrator opens the downloaded export.
- **Root cause:** The catalog CSV encoder handles CSV syntax but does not apply spreadsheet formula-injection neutralization.
- **Recommended fix:** Prefix formula-like cells with a safe text marker before quoting and add regression coverage for leading whitespace/control characters and each formula prefix.
- **Severity:** Medium
- **Status:** Verified

### Current-cycle automated evidence before repairs

| Check | Result | Evidence / limitation |
|---|---|---|
| `npm test` | FAIL | 123 tests: 121 passed, 2 failed (BUG-045 and BUG-046). Webhook tests emit expected connection errors because test `DATABASE_URL` resolves to unavailable `localhost:5432`; those tests pass their fallback assertions. |
| `npm run test:e2e` | FAIL / provider test skipped | Catalog and initial search assertions passed; checkout assertion failed because the unauthenticated route renders the intended sign-in gate (BUG-047). Provider sandbox test skipped because no `E2E_PAYMENT_PROVIDER` was configured. |
| `npm run build` | PASS WITH WARNINGS | Prisma client generated; Next compiled and generated all 166 pages. Lint/type validation passed within build. The static store-directory query logged that configured Neon was unreachable and used its fallback; no migration/write was run. Node `url.parse` deprecation and webpack cache snapshot warnings remain. |
| `npm run lint` | PASS WITH WARNINGS | 0 errors; 85 warnings (primarily unused symbols, `any`, hook dependency, and image optimization warnings). |
| `npm run type-check` | PASS | Frontend TypeScript and backend TypeScript checks returned exit code 0 in this clean, unchanged tree. |
| Worktree / database safety | PASS | Audit started on clean `saas-staging`; no Prisma migration, seed, database write, push, or deploy was run. |

## Audit method and evidence boundary

The repository was reviewed read-only before application repairs. The review covered the root/workspace manifests, all tracked source directories under `frontend`, `backend`, `tests`, `scripts`, Prisma schema and migrations, Next configuration, middleware, API route families, validators, authentication/tenant-access helpers, billing/payment services, storage, retention workers, UI route/component inventory, documentation, and visible test configuration.

Source review can establish code behavior and configuration defects. It cannot establish a live Neon connection, migration application, Vercel deployment, DNS, provider callback reachability, provider credentials, backups, or production browser behavior. Those remain explicitly marked as unverified below.

The pre-repair ledger was frozen before application changes. Subsequent changes are recorded in the repair and validation sections below.

## Severity and status definitions

- **Critical**: immediate payment, authorization, tenant-isolation, or data-loss risk.
- **High**: material security, financial, integrity, or launch-readiness defect.
- **Medium**: meaningful correctness, reliability, performance, or workflow defect.
- **Low**: maintainability, copy, developer-experience, or lower-impact UX defect.
- Statuses are `Pending`, `In Progress`, `Fixed`, and `Verified`. All findings below are `Pending` until repair work begins.

## Complete pre-repair issue report

### Critical

#### BUG-001 — M-Pesa verification can treat an incomplete provider response as successful

- **File path:** `backend/payments/mpesa/index.ts` (`verifyMpesaPayment`), consumed by `frontend/src/app/api/payments/mpesa/verify/route.ts`
- **Description:** The verification result uses `response.ResultCode ?? 0`, then considers `0` completed. A response that omits `ResultCode` can therefore become a completed payment. The route then reconciles the matching local payment, billing invoice/subscription, commission, and potentially order state.
- **Root cause:** Missing/invalid provider fields are defaulted to the success code instead of failing closed and requiring an explicit successful response.
- **Recommended fix:** Validate the provider response shape, require an explicit success result code and successful response metadata, reject missing/unknown codes, and make reconciliation idempotent with terminal-state guards.
- **Status:** Verified

#### BUG-002 — Public M-Pesa callback processing is not authenticated or strongly validated

- **File path:** `frontend/src/app/api/payments/webhooks/mpesa/stk-callback/route.ts`, `frontend/src/app/api/payments/webhooks/mpesa/c2b/route.ts`, `backend/payments/webhooks/index.ts`
- **Description:** Public callback routes cast request JSON directly to provider payload types. C2B processing accepts a reference and can update a payment without an application-level authenticity mechanism; callback fields such as result code, amount, account/reference, and transaction identity are not validated as a complete schema. Provider-specific authenticity assumptions are not documented or enforced in source.
- **Root cause:** TypeScript casts are used as runtime validation, and callback reconciliation is based primarily on a reference lookup rather than a verified, provider-specific event contract.
- **Recommended fix:** Add strict runtime schemas, reject malformed callbacks, require provider-specific authenticated/network controls where supported, bind reference/amount/currency/tenant/order or invoice, prevent terminal-state downgrades, and make unknown callbacks non-mutating.
- **Status:** Pending

### High

#### BUG-003 — Email verification codes have no attempt or abuse limit

- **File path:** `frontend/src/app/api/auth/verify-email/route.ts`
- **Description:** A caller can submit unlimited six-digit guesses for a known email until the code is accepted. Registration and resend endpoints have scoped rate limiting, but the code-verification endpoint does not have an attempt counter, lockout, or equivalent protection.
- **Root cause:** Verification reads and consumes the token but does not track failed attempts or apply a dedicated verification limiter.
- **Recommended fix:** Add a distributed, identifier/IP-scoped limiter and bounded attempt record; expire/delete the code after the limit; use a hashed code where practical and return uniform errors.
- **Status:** Pending

#### BUG-004 — Billing renewal requests are not idempotent and can create duplicate payment attempts

- **File path:** `backend/billing/service.ts` (`createMpesaInvoicePayment`), `frontend/src/app/api/manage/billing/route.ts`
- **Description:** Each renewal request creates a new invoice/payment/provider request. There is no request idempotency key or reuse of an existing open invoice, so double clicks, retries, or network retries can produce duplicate payment prompts and potentially duplicate charges.
- **Root cause:** Payment initiation is not protected by a durable idempotency contract or a unique billing-operation key.
- **Recommended fix:** Accept and persist an idempotency key, atomically reuse an open invoice/payment for the same subscription/period/operation, and add database uniqueness for the operation identity.
- **Status:** Pending

#### BUG-005 — M-Pesa initiation failure can leave reserved credits and an open invoice

- **File path:** `backend/billing/service.ts` (`createMpesaInvoicePayment`)
- **Description:** The database transaction creates an invoice and reserves credits before the provider initiation call. If initiation fails, the path does not reliably mark the invoice failed or release the reserved credits.
- **Root cause:** Provider initiation is outside the reservation transaction and lacks a compensating failure transaction.
- **Recommended fix:** Add a durable pending state and compensating release/failure update in a failure path, or use an outbox/worker model with reconciliation and retry semantics.
- **Status:** Pending

#### BUG-006 — Payment verification can downgrade a completed payment and create inconsistent order state

- **File path:** `backend/payments/mpesa/index.ts`, `backend/payments/cards/index.ts`
- **Description:** Verification writes the provider-derived status directly. A later pending/failed/cancelled response can overwrite a local `COMPLETED` payment, while order, invoice, credit, and commission state may already have been finalized.
- **Root cause:** Verification lacks a centralized monotonic payment state machine and terminal-state guard.
- **Recommended fix:** Centralize legal payment transitions, make `COMPLETED` immutable except for explicit refund/reversal transitions, and reconcile dependent records transactionally.
- **Status:** Pending

#### BUG-007 — Stripe webhook receipts can acknowledge failed processing permanently

- **File path:** `backend/payments/webhooks/index.ts`
- **Description:** The webhook receipt/deduplication record is created before event processing completes. If reconciliation fails after receipt creation, a provider retry is treated as a duplicate and the event may never be processed.
- **Root cause:** Receipt deduplication is not coupled to a durable processing status/retry mechanism.
- **Recommended fix:** Store `RECEIVED/PROCESSING/PROCESSED/FAILED` state with retry-safe updates, or mark an event processed only after successful reconciliation; preserve failed events for retry and operations review.
- **Status:** Pending

#### BUG-008 — Production environment validation omits the private R2 bucket

- **File path:** `scripts/check-env.mjs`, `backend/lib/storage.ts`, `frontend/src/app/api/manage/verification/evidence/route.ts`
- **Description:** Production `check:env` validates public R2 configuration but not `R2_PRIVATE_BUCKET_NAME`. Verification evidence upload requires the private bucket and can fail after an apparently successful readiness check.
- **Root cause:** Readiness requirements and storage code requirements are inconsistent.
- **Recommended fix:** Require and validate the private bucket whenever merchant verification is enabled; add a storage capability check to readiness and a test covering the requirement.
- **Status:** Pending

#### BUG-009 — Order status updates accept invalid state transitions

- **File path:** `backend/services/order.service.ts`, `backend/validators/orderValidator.ts`, order status API routes/controllers
- **Description:** The validator permits all enum values and the service writes the requested status without enforcing a legal transition graph. A delivered/cancelled order can therefore be moved back to an earlier or contradictory state.
- **Root cause:** Status validation checks membership in the enum but not the current state and actor-specific transition rules.
- **Recommended fix:** Define an explicit transition matrix, enforce it in the service inside a transaction, and make cancellation/refund/inventory effects terminal and idempotent.
- **Status:** Pending

#### BUG-010 — Uploaded files are trusted by MIME type without content validation

- **File path:** `frontend/src/app/api/products/upload/route.ts`, `frontend/src/app/api/manage/verification/evidence/route.ts`, `backend/lib/storage.ts`
- **Description:** Product and verification uploads accept client-provided MIME types without magic-byte/content validation. Product uploads accept any `image/*`, and key extension handling is not as strict as the verification key path. This permits spoofed or unexpected content to enter storage and can create operational/security problems when served or downloaded.
- **Root cause:** Validation trusts `File.type` and filename metadata rather than inspecting content and normalizing allowed formats.
- **Recommended fix:** Validate magic bytes with an allowlist, normalize/re-encode public images, reject SVG/scriptable formats unless deliberately sanitized, sanitize keys, and apply equivalent controls to private evidence.
- **Status:** Pending

#### BUG-011 — Public contact form needed stronger abuse controls and had duplicate notifications

- **File path:** `frontend/src/app/api/contact/route.ts`, `backend/controllers/supportController.ts`, `backend/services/support.service.ts`, `backend/validators/supportValidator.ts`
- **Description:** The contact endpoint initially had only IP rate limiting and no bot/challenge verification despite the public form and support-notification side effects. `createTicket` sent a support notification and `submitContact` sent another, so one submission could create duplicate team emails. Contact field limits were also weaker than the other public forms. The source now has layered rate limiting, a honeypot, bounded fields, and one notification owner.
- **Root cause:** Anti-abuse and notification responsibility are split inconsistently between route/controller/service layers.
- **Recommended fix:** Keep the layered controls and add a managed CAPTCHA only if abuse levels justify the operational dependency; retain a test that one request creates one ticket and one team notification.
- **Status:** Pending

### Medium

#### BUG-012 — Analytics and recommendations include unpaid orders in sales/revenue signals

- **File path:** `backend/services/analytics.service.ts`, `backend/services/recommendation.service.ts`, `backend/services/inventory.ts`, customer/admin statistics services
- **Description:** Several queries filter out only `CANCELLED` orders, rather than requiring a completed payment. Pending, failed, or otherwise unpaid orders can inflate revenue, sales counts, category performance, customer value, reorder velocity, and recommendations.
- **Root cause:** Commerce reporting uses order status as a proxy for payment settlement.
- **Recommended fix:** Define one settled-order predicate based on completed payment/refund policy and use it consistently in analytics, recommendations, inventory velocity, dashboard cards, exports, and customer value.
- **Status:** Pending

#### BUG-013 — Analytics CSV export is vulnerable to spreadsheet formula injection

- **File path:** `backend/services/analytics.service.ts` CSV export
- **Description:** Merchant-controlled product/category/region strings are interpolated into CSV output without escaping or formula-prefix neutralization. Names beginning with `=`, `+`, `-`, or `@` can be interpreted as formulas by spreadsheet applications.
- **Root cause:** CSV generation is string concatenation without a dedicated safe-cell encoder.
- **Recommended fix:** Quote every cell, escape quotes/newlines, and prefix dangerous formula-leading values with a single quote or otherwise neutralize them; add regression tests.
- **Status:** Pending

#### BUG-014 — Cart writes can race and create duplicate logical cart rows

- **File path:** `backend/services/cart.service.ts`, `backend/prisma/schema.prisma`
- **Description:** Add-item behavior reads for an existing item then updates or creates separately. The schema has no composite uniqueness covering the cart owner/product/variant identity, so concurrent requests can create duplicates.
- **Root cause:** Read-modify-write is not atomic and the logical key is not enforced by the database.
- **Recommended fix:** Add a normalized variant key and composite unique constraint, then use an atomic upsert/transaction with a migration and duplicate-data precheck.
- **Status:** Pending

#### BUG-015 — Storage quota checks are race-prone and replacement files can accumulate

- **File path:** `frontend/src/app/api/products/upload/route.ts`, `backend/billing/subscription.ts`, `backend/lib/storage.ts`
- **Description:** Quota is checked before the asset row is created, allowing concurrent uploads to exceed the limit. Replacing/removing product/profile images does not consistently delete old object keys and asset rows, causing quota and storage drift.
- **Root cause:** Quota reservation and object lifecycle are not one atomic durable operation.
- **Recommended fix:** Reserve bytes transactionally or serialize quota updates, link assets to the owning record, and delete/retire replaced objects with retryable cleanup.
- **Status:** Verified

#### BUG-016 — Tenant consistency is not enforced across several Prisma relations

- **File path:** `backend/prisma/schema.prisma` and related migrations
- **Description:** Multiple records carry independent `tenantId` and related-record IDs without composite foreign keys (for example product/category, variant/product, order item/order/product, domain/store, enquiry/quote, and storage/billing relations). Code usually scopes queries correctly, but a bug or direct write can create cross-tenant records that the database permits. Several catalog identifiers are globally unique, unnecessarily coupling tenants.
- **Root cause:** Tenant ownership is primarily an application convention rather than a database-enforced composite relationship.
- **Recommended fix:** Add composite tenant-aware keys/FKs where feasible, audit existing data before migration, and preserve explicit tenant predicates in every service query.
- **Status:** Verified

#### BUG-017 — Product dashboard links use IDs while the public route resolves slugs

- **File path:** `frontend/src/components/home/FeaturedProducts.tsx`, `frontend/src/components/dashboard/TopProducts.tsx`, `frontend/src/app/products/[slug]` route
- **Description:** These components build `/products/${product.id}`, while the public dynamic route and product lookup are slug-based. Unless an ID happens to equal a slug, the links lead to a not-found page.
- **Root cause:** UI navigation uses a different product identity than the route contract.
- **Recommended fix:** Return/use `slug` in the component data and link with the slug; add a rendered-link smoke test.
- **Status:** Pending

#### BUG-018 — Variant stock can disagree with base product availability in the UI

- **File path:** product cards/detail/cart UI and `backend/lib/product-variant.ts` consumers
- **Description:** Several UI paths read the base product stock to decide availability even when a selected variant has independent stock. A product can appear unavailable or permit an incorrect action depending on variant selection.
- **Root cause:** Availability logic is duplicated and does not consistently use the resolved variant selection.
- **Recommended fix:** Centralize availability/quantity rules and use the same variant-aware result in cards, product detail, cart, enquiry, and checkout flows.
- **Status:** Verified

#### BUG-019 — Public catalog media bypasses the configured Next image allowlist

- **File path:** `frontend/src/components/platform/PlatformDiscoveryHome.tsx` and catalog image consumers; `frontend/next.config.ts`
- **Description:** Raw image elements can render merchant-provided remote URLs while the Next image configuration only allowlists selected hosts. Arbitrary third-party media can be slow, unavailable, or privacy-impacting and is not optimized.
- **Root cause:** Media source validation/optimization is inconsistent between raw `<img>` and Next image paths.
- **Recommended fix:** Validate/normalize approved media origins or proxy/rehost uploads, use optimized image components where suitable, and provide dimensions/fallbacks.
- **Status:** Verified

#### BUG-020 — Lifecycle sweep can starve due subscriptions at scale

- **File path:** `backend/billing/lifecycle.ts`
- **Description:** The sweep takes a fixed number of nonterminal subscriptions ordered by `updatedAt`, then evaluates due status in memory. With enough old non-due rows, due rows outside the first page can be delayed or repeatedly missed.
- **Root cause:** The query does not select due conditions or paginate through the full eligible set.
- **Recommended fix:** Query due conditions directly, paginate with a stable cursor, and record/retry failures without starving later rows.
- **Status:** Pending

#### BUG-021 — Webhook reconciliation can acknowledge database failures

- **File path:** `backend/payments/webhooks/index.ts`
- **Description:** Some provider-reference reconciliation errors are caught and converted to a null result while the route can still return a provider-success response. This can suppress provider retries while local payment/order state remains stale.
- **Root cause:** External callback acknowledgment is not coupled to successful local reconciliation or a durable retry queue.
- **Recommended fix:** Return a retryable failure when reconciliation did not complete, or persist a durable event for retry before acknowledging.
- **Status:** Pending

#### BUG-022 — API error responses expose internal error messages inconsistently

- **File path:** `backend/lib/api-handler.ts` and multiple controllers/routes under `frontend/src/app/api`
- **Description:** Many catch blocks return `error.message` directly. Database, provider, storage, and configuration errors can expose implementation details to clients and create inconsistent status codes.
- **Root cause:** Error normalization is not centralized and catch variables are broadly typed as `any`.
- **Recommended fix:** Use typed public errors, centralize safe error serialization, log request IDs/server details privately, and return stable client messages.
- **Status:** Verified

#### BUG-023 — Notification preference is not applied consistently to order SMS

- **File path:** `backend/services/order.service.ts` order status notification path
- **Description:** The status update path checks the WhatsApp preference but sends SMS without the equivalent customer `orderUpdates` preference check.
- **Root cause:** Channel preference logic is duplicated and incomplete.
- **Recommended fix:** Use one channel-preference helper for email/SMS/WhatsApp and test opt-out behavior per channel.
- **Status:** Pending

#### BUG-024 — Request and text payload bounds are inconsistent on order/support APIs

- **File path:** `backend/validators/orderValidator.ts`, `backend/validators/supportValidator.ts`, invitation/import APIs
- **Description:** Some public strings and arrays have no maximum length, and idempotency headers are not bounded. Large payloads can increase parsing, database, log, and notification costs.
- **Root cause:** Validation schemas were added piecemeal without shared size policy.
- **Recommended fix:** Add explicit limits for all public text, arrays, headers, and import rows; reject oversized bodies at the route/platform boundary.
- **Status:** Pending

#### BUG-025 — Verification tokens were stored in plaintext

- **File path:** `frontend/src/app/api/auth/register/route.ts`, `frontend/src/app/api/auth/verify-email/route.ts`, `backend/prisma/schema.prisma`
- **Description:** Six-digit verification codes were stored as plaintext in the database. The source now stores a keyed HMAC and performs a timing-safe comparison during verification.
- **Root cause:** Short-lived verification tokens used direct lookup storage.
- **Recommended fix:** Store a keyed hash, bound attempts, expire old tokens, and keep registration responses safe.
- **Status:** Pending

#### BUG-032 — Verification delivery failure needs an explicit recovery state

- **File path:** `frontend/src/app/api/auth/register/route.ts`, `backend/lib/email.ts`, verification UI
- **Description:** Registration can create an unverified user while email delivery is unavailable. Resend is available, but delivery outcome is not persisted as an operator-visible recovery state.
- **Root cause:** User creation and email delivery are not connected through a durable delivery/outbox state.
- **Recommended fix:** Persist delivery status or enqueue verification mail durably, expose a safe resend/recovery path, and monitor failed delivery without leaking account existence.
- **Status:** Verified

#### BUG-026 — The public browser smoke harness does not provision or reuse a server

- **File path:** `playwright.config.ts`
- **Description:** The configuration has a base URL but no `webServer`. Running the documented root E2E script without separately starting Next produces connection refusal rather than testing the application.
- **Root cause:** Server lifecycle is external to the E2E configuration and is not documented as a required precondition in the script.
- **Recommended fix:** Configure a controlled `webServer` command/reuse policy or provide a dedicated test script that starts and tears down the server, with environment prerequisites documented.
- **Status:** Pending

### Low

#### BUG-027 — Required quality scripts are absent

- **File path:** `package.json`, `frontend/package.json`, `backend/package.json`
- **Description:** The requested root `lint` and `type-check` scripts do not exist. Direct workspace TypeScript checks pass, but the project cannot provide a consistent scripted lint/type-check quality gate.
- **Root cause:** Workspace scripts were not wired and no ESLint configuration is present.
- **Recommended fix:** Add pinned, compatible lint/type-check scripts and configuration, then run them from the root and CI.
- **Status:** Pending

#### BUG-028 — Type safety is weakened by broad `any` usage

- **File path:** billing/webhook/controllers, `frontend/src/lib/auth.ts`, UI data loaders, `backend/lib/api-handler.ts`, and other locations identified by the audit scan
- **Description:** Broad `any` and JSON casts reduce compile-time protection around authentication callbacks, provider payloads, API errors, and UI response data. This contributed directly to the callback and error-handling risks above.
- **Root cause:** External/provider and JSON boundaries are not modeled with runtime schemas and narrow interfaces.
- **Recommended fix:** Replace boundary `any` with inferred Zod/provider types, use `unknown` in catches, and type API response contracts incrementally.
- **Status:** Pending

#### BUG-029 — Stale product/support branding and inconsistent copy remain in user-facing paths

- **File path:** `backend/services/support.service.ts` and related product/support UI paths
- **Description:** Support confirmation copy still refers to “ElectroBuy” while the current platform branding is Nurava HubStores. This creates customer-facing trust and consistency issues.
- **Root cause:** Legacy copy was not included in the rebrand sweep.
- **Recommended fix:** Perform a repository-wide visible-copy review, preserve intentional historical identifiers, and add copy checks for public branding.
- **Status:** Pending

#### BUG-030 — Several list/report paths rely on broad in-memory result sets

- **File path:** analytics, admin/customer, catalog, and related Prisma services under `backend/services` and `backend/controllers`
- **Description:** Some analytics/report queries fetch large order/item sets into application memory and several operational lists use fixed limits rather than cursor pagination. This can increase query latency and memory usage as tenant data grows.
- **Root cause:** Pagination/aggregation strategy is inconsistent across reporting and operational screens.
- **Recommended fix:** Push aggregations to SQL where appropriate, add tenant-scoped indexes and cursor pagination, and cap/export large datasets deliberately.
- **Status:** Pending

#### BUG-031 — E2E checkout assertion used obsolete copy for direct-merchant commerce

- **File path:** `tests/e2e/checkout.spec.ts`
- **Description:** The smoke test expected `/checkout` to contain “checkout” or “cart is empty”, but the current intentional direct-merchant flow renders “No products selected” and asks the shopper to contact the merchant. The assertion failed even though the page returned 200 and the intended flow was rendered.
- **Root cause:** The test contract was not updated with the current `MERCHANT_DIRECT` commerce model.
- **Recommended fix:** Assert the supported direct-merchant empty state while retaining the checkout/cart alternatives for shopper commerce mode.
- **Status:** Fixed

## Current status register after repair batch

This register is the authoritative current status for the findings above. “Verified” means verified by source review plus the available automated checks; it does not mean live provider, Neon, deployment, or production verification.

| ID | Current status | Evidence/limitation |
|---|---|---|
| BUG-001 | Verified | Fail-closed pure status mapping, runtime provider response validation, regression test; live Daraja response not exercised. |
| BUG-002 | Verified | Strict STK/C2B schemas, shortcode binding, provider STK re-query when configured, provider-scoped lookups; live callback authenticity/network controls remain deployment verification. |
| BUG-003 | Verified | IP and account-scoped distributed limiter added; live database limiter behavior not exercised. |
| BUG-004 | Verified | Durable open-invoice/payment reuse plus PostgreSQL advisory transaction lock; live concurrent Neon test not exercised. |
| BUG-005 | Verified | Initiation failure compensates payment, credit reservation, and invoice state; live provider failure not exercised. |
| BUG-006 | Verified | M-Pesa and Stripe verification paths protect completed payments and avoid duplicate order finalization; live provider transitions not exercised. |
| BUG-007 | Verified | Webhook receipt processing state and retry path added with migration; migration has not been applied to a live database. |
| BUG-008 | Verified | `R2_PRIVATE_BUCKET_NAME` is now included in production readiness requirements. |
| BUG-009 | Verified | Explicit order transition matrix plus regression test. |
| BUG-010 | Verified | MIME and magic-byte validation now cover product and verification uploads; live object-storage behavior remains unverified. |
| BUG-011 | Verified | Duplicate notification removed; field bounds, distributed limiter, and honeypot added. Managed CAPTCHA remains optional deployment hardening. |
| BUG-012 | Verified | Analytics, recommendations, inventory velocity, and order statistics now require a completed payment; broader live data reconciliation remains unverified. |
| BUG-013 | Verified | CSV cell encoder and formula-injection regression test added. |
| BUG-014 | Verified | Cart add operations now serialize the tenant/user/product/variant logical key with a PostgreSQL transaction lock; a future uniqueness migration remains recommended for legacy duplicate cleanup. |
| BUG-015 | Verified | Product uploads reserve quota under a tenant advisory transaction lock; failed uploads compensate, and product replacement/deletion retires obsolete R2 objects and asset rows. Live R2/Neon execution remains unverified. |
| BUG-016 | Verified | Current schema has tenant-scoped uniqueness for Category name/slug, Product slug/SKU, and Variant SKU; migration 0022 adds the scoped constraints after duplicate preflight checks. Live migration state remains unverified. |
| BUG-017 | Verified | Analytics top-product payload now includes and uses `slug`; source compilation passed. |
| BUG-018 | Verified | Product cards, wishlist, enquiry, and checkout-facing selection paths now use variant-aware availability; source checks and tests pass. |
| BUG-019 | Verified | Platform discovery validates remote media origins and uses optimized `next/image` rendering with configured R2 host patterns. Other non-catalog legacy image warnings remain outside this finding. |
| BUG-020 | Verified | Lifecycle query now selects due candidates directly; scale testing against a populated database remains unverified. |
| BUG-021 | Verified | Public M-Pesa callback routes now opt into retryable failure on reconciliation/database errors; legacy internal handler callers retain compatibility behavior. |
| BUG-022 | Verified | API serializer now returns stable fallback messages and safe status mappings; affected controllers and route families no longer expose raw infrastructure messages. Intentional BillingError/user-input messages remain explicit public contracts. |
| BUG-023 | Verified | SMS now respects the same order-update preference as WhatsApp in the status path. |
| BUG-024 | Verified | Order and support payload bounds were strengthened; all public schemas still warrant future shared policy review. |
| BUG-025 | Verified | Verification codes are HMAC-hashed and checked timing-safely; delivery recovery is tracked separately as BUG-032. |
| BUG-026 | Verified | Managed Playwright server lifecycle, warm navigation timeout, and smoke run pass. |
| BUG-027 | Verified | Root lint/type-check scripts and actual Next ESLint configuration exist; lint passes with 150 warnings. |
| BUG-028 | Verified | Payment/provider/API boundaries now use narrow interfaces, `unknown` guards, Prisma input types, and typed UI/API response contracts; compiler and lint pass with no errors. A small legacy presentation-only admin state backlog still emits explicit lint warnings and is non-blocking. |
| BUG-029 | Verified | Repository-visible support confirmation copy now uses Nurava HubStores. |
| BUG-030 | Verified | Analytics overview, growth, sales periods, categories, top products, regions, payment methods, and customer reporting now use tenant-scoped database aggregation; top-product output is bounded to 100 rows. |
| BUG-031 | Verified | Updated direct-merchant assertion; Playwright smoke passes. |
| BUG-032 | Verified | VerificationToken now records delivery status, attempts, deliveredAt, and bounded delivery errors for register/resend recovery. A full external outbox remains a future scale enhancement. |
| BUG-033 | Verified | Paid-order analytics now counts eligible non-cancelled orders separately from settled orders; regression coverage passes. |
| BUG-034 | Verified | Recommendation feeds use tenant-scoped base-or-variant availability and report effective variant stock; source checks and tests pass. |
| BUG-035 | Verified | Profile uploads require matching magic bytes and clean up replaced/failed public objects. |
| BUG-036 | Verified | Password reset records store keyed one-way token digests with a reset-specific identifier namespace; regression coverage passes. |
| BUG-037 | Verified | Invitation email values are escaped and links use the configured public application URL. |
| BUG-038 | Verified | Consolidated into BUG-016; migration 0022 replaces global catalog uniqueness with tenant-scoped constraints after duplicate preflight checks. |
| BUG-039 | Verified | Stock movement history now requires a completed payment and tenant-scopes order items. |
| BUG-040 | Verified | Inventory alerts now emit one record for every affected tenant variant. |
| BUG-041 | Verified | Reorder reporting stores selected variant IDs on new order items, uses variant velocity, and avoids misleading base-product suggestions for variant products. |
| BUG-042 | Verified | Card, M-Pesa, and webhook order finalization now claims only still-pending orders atomically before sending confirmation. |
| BUG-043 | Verified | Industry attributes round-trip in catalog CSV; import validates required/typed values and persists attribute replacements atomically, with tenant/store-scoped reads and existing-value preservation when the column is absent. |
| BUG-044 | Verified | Warranty controls and copy are electronics-specific; cart/deals support text is industry-aware and the contact warranty topic is conditional. |
| BUG-045 | Verified | OTP attempt/success assertions now use an explicit in-window simulated time, making the test deterministic. |
| BUG-046 | Verified | Platform hero regression now checks the current `TrustStrip` contract. |
| BUG-047 | Verified | Unauthenticated checkout smoke now asserts the expected sign-in gate and preserved checkout callback. |
| BUG-048 | Verified | Current-cycle metadata and final audit report were reconciled to this `saas-staging` audit; previous cycle records remain historical. |
| BUG-049 | Verified | Shared catalog CSV cell encoding neutralizes formula-like text, including control/space-prefixed values, with regression coverage. |
| BUG-050 | In Progress | Conditional transactional completion/cancellation and late-payment refund review are implemented; live DB concurrency validation remains. |
| BUG-051 | Fixed | Idempotency digest binds tenant, owner, client key, and canonical complete checkout payload; regression tests cover changed checkout details and cross-scope isolation. |
| BUG-052 | In Progress | Card intents are KES/store-bound and reconcile provider amount/currency; live provider/DB tests remain. |
| BUG-053 | Fixed | Card intents enforce CARD at route and service boundaries. |
| BUG-054 | Fixed | Checkout persists a PII-free retry key per payload fingerprint and clears it after success. |
| BUG-055 | Fixed | Stripe verification requires local tenant/provider payment ownership and shopper authorization. |
| BUG-056 | Fixed | M-Pesa verification scopes route and service lookups to the provider. |
| BUG-057 | Verified — no defect | Image consumers already pass active industry context. |
| BUG-058 | Fixed | Boutique product/contact/FAQ copy is apparel-specific. |
| BUG-059 | Fixed | Product comparison uses boutique attribute fields and neutral fallback rows. |
| BUG-060 | In Progress | Billing input and Stripe price configuration are KES-only; live Stripe validation remains. |
| BUG-061 | Fixed | Stripe intent replay validates requested order, amount, and currency. |
| BUG-062 | Fixed | Onboarding surfaces industry API errors instead of a false electronics-only fallback. |
| BUG-063 | Fixed | Pending card status does not cancel; verify checks payment/order ownership. |
| BUG-064 | Fixed | New stores accept only KES currency. |
| BUG-065 | Verified — no defect | User-approved shared demo WhatsApp number is covered for all demo stores, including the boutique. |
| BUG-066 | Fixed | Product cards show legacy specs only in electronics and show product attributes for other industries; four-industry regression coverage added. |
| BUG-067 | Fixed | Comparison localStorage key is store-specific across all industries; the ambiguous shared electronics key is not imported. |
| BUG-068 | Fixed | Offline design drafts are store-specific and reload on store changes; the ambiguous legacy global draft is not imported. |
| BUG-069 | Verified | Catalog E2E test asserts deterministic product display and query filtering rather than accepting a 503/empty fallback. |
| BUG-070 | Verified | Replaced 31 explicit frontend `any` types across eight files with inferred billing API types, narrow response interfaces, and `unknown` error handling; strict no-explicit-any lint passes. |
| BUG-071 | Verified | Setup-fee status and amount now read from `tenant.billingRecord`, matching the billing snapshot response; type-check and production build pass. |
| BUG-072 | Verified | Tenant regression tests use a restore-safe typed mock helper and narrow callback inputs; focused isolation tests, a dedicated strict TypeScript test project, and a repository no-explicit-any scan pass. |
| BUG-073 | Verified | Playwright now covers sign-in/sign-up rendering, unauthenticated admin/manage redirects, and platform mobile menu open/close links; 2 deterministic Chromium flows pass. |
| BUG-074 | Verified | Credential registration sends consent and the API requires literal `acceptedTerms: true`; missing/false values are rejected and regression tests cover each case. |
| BUG-075 | Verified | Signup consent uses component validation with `aria-required`, so unchecked submission renders the accessible custom consent message; Playwright verifies it. |
| BUG-076 | Verified | Backup verification compares normalized PostgreSQL host/port/database identities and refuses same-database restores before launching dump or restore commands; identity regression tests pass. |
| BUG-077 | Verified | Signup E2E waits up to 15 seconds for the expected URL before asserting the rendered heading; the complete deterministic browser suite passes. |
| BUG-078 | Verified | Admin data loaders sequence requests and ignore stale success/error/loading updates after a newer filter or search request begins. |
| BUG-079 | Verified | Merchant verification loads are sequenced; stale tenant responses are ignored and previously loaded tenant data is not rendered under a different tenant URL. |
| BUG-080 | Pending | Signup browser regression does not observe the consent validation feedback after submitting valid fields with the consent box unchecked. |

#### BUG-066 — Product cards expose electronics-only specification text in every industry

- **File:** `frontend/src/app/products/ProductsClient.tsx`
- **Description:** The shared product card renders every `product.specs` entry without checking the active store industry. Legacy or previously copied electronics products with populated `specs` can therefore display labels such as processor/RAM on cake, furniture, and boutique catalog pages even though product detail and merchant-entry controls correctly gate these fields to electronics.
- **Root cause:** Product-card presentation reads the legacy `Product.specs` column unconditionally instead of selecting industry-appropriate highlights.
- **Recommended fix:** Render legacy specs only for electronics; for other industries, use the current product's industry attribute values or omit the electronics-only summary. Add a regression test for all four industries.
- **Severity:** Medium
- **Status:** Fixed — card highlights now read legacy specs only for electronics and use per-product industry attributes elsewhere; tests cover electronics, cakes, furniture, boutiques, and unknown industry context.

## Newly observed operational verification gap

- The configured Neon endpoint was unreachable during the current build and browser smoke. Earlier browser diagnostics also observed missing-table `P2021` responses against a local database configuration; that earlier condition is retained as historical evidence, not asserted as the current connection target. No migration or seed was run because the database target was not confirmed safe. Live authenticated/seeded SaaS flows and current demo catalog contents remain unverified; this is an environment gate, not a source-code finding.

## Areas reviewed with no confirmed source defect at audit freeze

- React component tree, hooks, providers, loading/error/empty-state patterns, and hydration-sensitive theme initialization were scanned; no additional confirmed defect was promoted without reproducible evidence.
- React rendering uses escaped text for dynamic content; the only `dangerouslySetInnerHTML` use is a fixed theme bootstrap script in `frontend/src/app/layout.tsx`, not user content.
- API route middleware intentionally excludes `/api`; route/controller-level session, membership, permission, tenant, cron-secret, and public-route checks were traced rather than assuming middleware protection.
- Prisma schema syntax and TypeScript compilation passed in direct workspace checks below. This does not prove migration application or live database behavior.
- Payment providers, email, SMS, WhatsApp, object storage, DNS, and deployed callback endpoints remain live-environment gates, not confirmed operational facts.

## Cycle 15 staging verification after transfer — 2026-10-09

The source changes are on `saas-staging` as ordinary unstaged/uncommitted changes. A recoverable stash remains as a backup. No commit, push, deployment, migration, seed, or database write was performed.

| Check | Result | Evidence / limitation |
|---|---|---|
| `npm test` | PASS | 138 passed, 0 failed, 0 skipped. Webhook fallback tests logged expected local database connection errors. |
| `npm run lint` | PASS WITH WARNINGS | 0 errors; 83 warnings, matching the existing unused-symbol, hooks, `any`, and image-optimization warning categories. |
| `npm run type-check` | PASS | Frontend TypeScript and backend `tsc` completed with exit code 0. |
| `npm run build` | PASS WITH WARNINGS | All 166 routes built. Neon was unreachable during store-directory static rendering and the existing fallback handled it; webpack cache and Node `url.parse()` warnings remain. |
| `npm run test:e2e` | NOT CLEANLY VERIFIED ON STAGING | The earlier attempt reached one passing Chromium smoke and skipped the provider test, but the runner did not exit cleanly and was interrupted. Do not count it as a clean staging E2E pass. |
| `git diff --check` | PASS | No whitespace errors. |
| Database / remote state | NOT TOUCHED | No migration, seed, database write, push, or deployment. |

### Cycle 15 conclusion

The boutique-inclusive code transfer and requested source checks now pass on `saas-staging`. This is not the final audit closeout: BUG-050, BUG-051, BUG-052, and BUG-060 remain `In Progress`; provider/database-backed validation and a clean Playwright exit are outstanding. The two-consecutive-clean-audits gate has not been met, so the project audit remains open.

## Cycle 16 — complete-payload idempotency repair — 2026-10-09

BUG-051 is repaired without a Prisma schema change: the server now hashes the tenant, normalized authenticated-user/guest scope, client idempotency key, and canonicalized full validated checkout payload into the existing `Order.idempotencyKey` field. This makes retries deterministic independent of JSON object key ordering and prevents changed shipping, payment, delivery, coupon, notes, item, variant, or customization data from receiving an order created for a different payload. Only a SHA-256 digest is persisted. Focused regression tests pass (3/3). No migration or database operation was performed.

Full verification after this repair remains pending; do not treat this cycle as one of the required clean full-audit passes until checks and the complete code review have been rerun.

## Cycle 17 — four-industry product-card isolation — 2026-10-09

The renewed source scan found BUG-066: the catalog card had been the remaining unguarded product-summary consumer of legacy `Product.specs`, allowing old electronics specs to surface in non-electronics stores. The card now shows legacy specs only for electronics; cake, furniture, and boutique cards use the product's industry attributes, and unknown-industry cards fail closed by not showing legacy specs. Targeted regressions pass (3/3). Full suite, lint, type-check, build, UI/browser behavior, and the two-clean-audit requirement remain to be revalidated.

### Cycle 16 verification — 2026-10-09

| Check | Result | Evidence / limitation |
|---|---|---|
| Focused idempotency tests | PASS | 3 passed, 0 failed; canonical object ordering, changed payload rejection-by-key-isolation, and tenant/owner/client-key scope covered. |
| `npm test` | PASS | 141 passed, 0 failed, 0 skipped. Existing payment webhook fallback tests logged expected connection failures against unavailable local PostgreSQL. |
| `npm run lint` | PASS WITH WARNINGS | 0 lint errors; 83 existing warnings. Backend TypeScript build completed as part of the command. |
| `npm run type-check` | PASS | Frontend no-emit TypeScript check and backend `tsc` completed with exit code 0. |
| `npm run build` | PASS WITH WARNINGS | Exit code 0; Prisma client generated and all 166 routes built. Store-directory static rendering fell back after the configured Neon host was unreachable; webpack cache and Node `url.parse()` warnings remain. |
| `npm run test:e2e` | NOT VERIFIED — LOCAL SERVER DID NOT BECOME READY | Playwright emitted database fallback logs but no listening local server or test results; the stalled run was interrupted. This is not a passing E2E result. |
| `git diff --check` | PASS | No whitespace errors; Git emitted only LF-to-CRLF working-copy notices. |
| Database / remote state | NOT TOUCHED | No migration, seed, database write, commit, push, or deployment. |

These checks validate the changed source and build, but do not satisfy the handoff's requirement for two complete consecutive clean full-audit passes. BUG-050, BUG-052, and BUG-060 plus the database/provider and browser gates remain open.

## Automated verification log (pre-repair)

| Check | Result | Evidence |
|---|---|---|
| `npm install --ignore-scripts --no-audit --no-fund` | PASS | Dependencies reported up to date. |
| `npm test` | PASS | All visible Node test files completed without failures; expected missing-provider warnings were emitted by negative/fallback tests. |
| `npm run lint` | BLOCKED | Root script is missing (`Missing script: lint`). See BUG-027. |
| `npm run build` | FAIL/BLOCKED | Next build did not start because `backend db:generate` failed on Windows with Prisma engine rename `EPERM`; this is an environment/file-lock failure, not a compiler result. |
| `npm run type-check` | BLOCKED | Root script is missing. See BUG-027. |
| `npm --workspace frontend exec tsc -- --noEmit` | PASS | Direct frontend TypeScript check completed with exit code 0. |
| `npm --workspace backend run build` | PASS | Direct backend `tsc` completed with exit code 0. |
| Prisma schema validation with a local placeholder `DATABASE_URL` | PASS | Prisma 6.19.3 reported the schema valid. This proves schema syntax only. |
| `npm audit --omit=dev --audit-level=high --json` | NOT RUN | The command could not be launched because the local sandbox helper returned an access-denied setup failure; no dependency vulnerability claim is made. |

## User-flow and Playwright log (pre-repair)

| Flow | Result | Evidence |
|---|---|---|
| Catalog/search/checkout smoke | PASS then environment-blocked rerun | After adding `webServer` and correcting the intentional direct-merchant empty state, a warm run completed with `1 passed, 1 skipped`. A later managed run reached the app but timed out while `/api/products` waited on the unavailable Neon endpoint; it did not produce a new UI assertion failure. |
| Payment provider sandbox contract | SKIPPED | The test intentionally skips unless `E2E_PAYMENT_PROVIDER=mpesa` or `stripe` is configured; no provider credentials were supplied. |
| Auth, registration, login, logout, protected routes, dashboard, settings, forms, menus, mobile navigation, CRUD, billing, and checkout mutation flows | NOT VERIFIED | No authenticated/live seeded browser environment was available at audit freeze. This is an explicit verification gap, not a pass. |

## Repair and re-audit log

### Audit freeze — 2026-08-31

- Complete pre-repair issue report recorded above.
- No application source repair has begun.
- Next action: repair findings in severity order, updating each status `Pending -> In Progress -> Fixed -> Verified` only with evidence.

### Repair batch 3 — 2026-08-31

- Cycle 7 findings were repaired after being recorded: analytics denominator, variant-aware recommendations, profile file validation/cleanup, reset-token hashing, invitation email escaping/link origin, tenant-scoped catalog uniqueness, inventory settlement/variant reporting, durable order-item variant IDs, and atomic payment order finalization.
- BUG-016 was re-opened by the fresh audit and resolved through schema changes plus migration `0022_tenant_scoped_catalog_identifiers`; migration `0023_order_item_variant_ids` adds the variant-velocity data field. These migrations require deployment to the intended database before the changes are live.
- BUG-038 is retained as a duplicate audit record and consolidated into BUG-016; no separate defect remains.

### Recursive audit cycles 8 and 9 — 2026-08-31

- Cycle 8 re-scanned the repaired analytics, recommendation, upload, authentication, invitation, catalog schema/migrations, inventory, order-item, payment verification, webhook, tenant, API, and test paths. No new source findings were discovered.
- Cycle 9 repeated the repository-wide changed-file and consumer scan, including the atomic payment transition and migration/schema alignment. No new source findings were discovered.
- The two consecutive post-repair full source audits found no new defects. Authenticated browser workflows, live Neon migration state, provider callbacks, object storage, and dependency advisory results remain external verification gates.

### Automated validation after repair batch 3 — 2026-08-31

| Check | Result | Evidence / limitation |
|---|---|---|
| Prisma schema validation | PASS | `DATABASE_URL` supplied as a non-live test URL; schema loaded successfully. |
| `npm run type-check` | PASS | Frontend and backend TypeScript completed with exit code 0 after Prisma client regeneration. |
| `npm run lint` | PASS WITH WARNINGS | 0 errors and 79 warnings; existing warning debt remains. |
| `npm test` | PASS | 65 tests passed, 0 failed, 0 skipped, including new analytics/reset-token/recommendation regressions. |
| `npm run build` | PASS WITH WARNINGS | Production build generated 137 routes; Neon fallback, webpack cache, and Node deprecation warnings remain. |
| `npm run test:e2e` | ENVIRONMENT-LIMITED | Managed Playwright reached the app but could not complete because the configured Neon endpoint was unreachable; the run was stopped cleanly. |
| `npm audit --omit=dev --audit-level=high --json` | NOT VERIFIED | npm advisory endpoint was unreachable. |
| `git diff --check` | PASS | No whitespace errors. |

### Repair batch 1 — 2026-08-31

- Critical/high payment, billing, callback, verification, order-state, readiness, and browser-harness changes completed and source-verified where noted in the status register.
- Medium reporting, CSV, notification, validator, lifecycle, and product-link changes completed and source-verified where noted.
- Remaining pending findings are intentionally not marked verified.

### Automated validation after repair batch 1 — 2026-08-31

| Check | Result | Evidence |
|---|---|---|
| `npm run type-check` | PASS | Frontend TypeScript and backend `tsc` completed with exit code 0. |
| `npm test` | PASS | 62 tests passed, 0 failed, 0 skipped. Expected missing-provider and unavailable-local-DB logs were emitted by fallback tests. |
| `npm run lint` | PASS WITH WARNINGS | 0 errors and 159 warnings; backend build also passed. Warnings remain under BUG-028 and the maintainability backlog. |
| `npm run build` | PASS WITH WARNINGS | Next.js compiled, type-checked, and generated 137 static pages. Neon access and Node `url.parse` deprecation warnings remain environment/dependency signals. |
| `npm run test:e2e` | ENVIRONMENT-LIMITED | A warm local smoke run passed earlier; the latest managed run timed out against unavailable Neon. The payment-provider test remained intentionally skipped without provider configuration. |

## Recursive audit cycle 1 — 2026-08-31

- Re-scanned changed payment, billing, webhook, authentication, upload, validator, tenant, analytics, support, lifecycle, route, test, and configuration files after repair batch 1.
- Added file-signature and email-verification regression coverage; no new source defect was found beyond the already tracked delivery recovery gap BUG-032.
- Findings carried forward: BUG-015, BUG-016, BUG-018, BUG-019, BUG-022, BUG-028, BUG-030, and BUG-032.

## Recursive audit cycle 2 — 2026-08-31

- Re-scanned the complete changed-file set plus all route/config/test references after the final repair batch.
- No new source findings were discovered. Known residuals remain BUG-015, BUG-016, BUG-018, BUG-019, BUG-022, BUG-028, BUG-030, and BUG-032.
- This satisfies the two-consecutive-audits/no-new-findings condition, but not the separate live-environment quality gates.

### Final validation after repair batch 2 — 2026-08-31

| Check | Result | Evidence |
|---|---|---|
| `npm run type-check` | PASS | Frontend TypeScript and backend `tsc` completed after the remaining repair changes. |
| `npm test` | PASS | 63 tests passed, 0 failed, 0 skipped. |
| `npm run lint` | PASS WITH WARNINGS | 0 errors and 150 warnings; backend build passed. |
| `npm run build` | PASS WITH WARNINGS | Prisma client generated, Next.js production build passed, and 137 routes were generated. Database-unavailable, webpack cache, and Node deprecation warnings remain. |
| `npm run test:e2e` | ENVIRONMENT-LIMITED | The managed run reached the app but was stopped after hanging on `/api/products` while the configured Neon endpoint was unreachable; the payment-provider test remained intentionally skipped without provider configuration. |
| `git diff --check` | PASS | No whitespace errors; Git reported only normal Windows line-ending normalization warnings. |

## Recursive audit cycle 3 — 2026-08-31

- Re-scanned all changed source, route, migration, test, and configuration files after the storage, tenant-trigger, variant-media, error-normalization, customer-report, and verification-delivery repairs.
- No new source findings were discovered. BUG-028 remains open for broad type cleanup and BUG-030 remains open for remaining analytics/report aggregation work.
- The two consecutive no-new-findings condition remains satisfied; live Neon, provider, storage, and authenticated browser execution remain external verification gates.

## Recursive audit cycle 4 — 2026-08-31

- Performed a final repository-wide scan of changed files, API error paths, tenant-boundary migration coverage, storage reservations, variant availability consumers, image sources, reports, tests, and configuration.
- No new findings were discovered after cycle 3. The only open source findings remain BUG-028 and BUG-030, both already recorded in the authoritative status register.
- Cycles 3 and 4 are the two consecutive no-new-findings audits required by the repair process.

### Final regression rerun after cycle 4 — 2026-08-31

| Check | Result | Evidence |
|---|---|---|
| `npm run type-check` | PASS | Frontend TypeScript and backend `tsc` completed with exit code 0. |
| `npm test` | PASS | 63 tests passed, 0 failed, 0 skipped; expected provider/local-DB fallback logs only. |
| `git diff --check` | PASS | No whitespace errors; only normal Windows line-ending warnings. |

## Recursive audit cycles 5 and 6 — 2026-08-31

- Re-scanned analytics, reporting, billing/provider, API, authentication, upload, tenant, and frontend data-boundary paths after BUG-028 and BUG-030 repairs.
- Repeated the repository-wide source scan and checked the final diff against both repaired finding descriptions and their consumers.
- No new source findings were discovered. BUG-028 and BUG-030 are verified; the two consecutive post-repair audits are complete.

### Final regression rerun after cycles 5 and 6 — 2026-08-31

| Check | Result | Evidence |
|---|---|---|
| `npm run type-check` | PASS | Frontend TypeScript and backend `tsc` completed with exit code 0. |
| `npm run lint` | PASS WITH WARNINGS | 0 errors and 79 warnings; remaining warnings are legacy UI hook/unused-symbol warnings and presentation-only admin typing debt. |
| `npm test` | PASS | 63 tests passed, 0 failed, 0 skipped. |
| `npm run build` | PASS WITH WARNINGS | Next.js production build completed and generated 137 routes; unavailable Neon and dependency deprecation warnings remain. |

## Fresh full audit cycle 7 — 2026-08-31

This is a new audit cycle requested against `PROJECT_AUDIT_FIX_HANDOFF.md`. The repository was rescanned before this cycle's repairs. The review covered all tracked application/configuration/documentation/test areas, API route wrappers and controllers, authentication and tenant boundaries, Prisma schema and migrations, payment/billing flows, uploads, analytics/reporting, inventory, recommendation consumers, UI route inventory, and existing automated test configuration.

### Automated evidence collected before repair

| Check | Result | Evidence / limitation |
|---|---|---|
| `npm install --ignore-scripts --no-audit --no-fund` | PASS | Dependencies already up to date. |
| `npm run lint` | PASS WITH WARNINGS | 0 errors and 79 warnings. Existing warning debt is recorded under BUG-028 and remains a maintainability follow-up. |
| `npm run type-check` | PASS | Frontend and backend TypeScript checks completed with exit code 0. |
| `npm test` | PASS | 63 tests passed, 0 failed, 0 skipped. Provider/local-DB fallback warnings were expected in the test environment. |
| `npm run build` | PASS WITH WARNINGS | Next.js generated 137 routes. The configured Neon endpoint was unreachable during static data fallback; webpack cache and Node `url.parse()` deprecation warnings remain. |
| `npm audit --omit=dev --audit-level=high --json` | NOT VERIFIED | npm could not reach the advisory endpoint; this is not evidence of either a clean or vulnerable dependency set. |
| `npm run test:e2e` | ENVIRONMENT-LIMITED | Managed Playwright reached the local application but hung while `/api/products` waited on the unreachable configured Neon endpoint; the run was stopped cleanly. Authenticated/provider flows remain unverified without live seeded services. |
| Payment amount integrity trace | PASS (source) | Card and M-Pesa order initiation compare the submitted amount to the server-side order total before provider initiation; no new amount-tampering finding was opened. |

### New and re-opened findings discovered before repair

#### BUG-033 — Analytics conversion rate is hardcoded to 100% for any settled order

- **File path:** `backend/services/analytics.service.ts` (`getAnalyticsOverview`, `getGrowthComparison`); displayed by `frontend/src/components/dashboard/StatsGrid.tsx` and `frontend/src/app/admin/analytics/page.tsx`
- **Description:** The service counts settled orders, then sets conversion rate to `100` whenever the settled-order count is greater than zero. It has no denominator for eligible/non-cancelled orders, so a period containing one paid order and many unpaid orders reports 100%; growth is likewise flattened whenever both periods contain a paid order.
- **Severity:** Medium
- **Root cause:** The implementation uses the settled-order aggregate as both numerator and implicit denominator instead of separately counting eligible orders.
- **Recommended fix:** Count non-cancelled tenant orders separately, calculate the paid-order rate as settled orders divided by eligible orders, cap it to 100%, and add regression coverage for mixed paid/unpaid periods and empty periods.
- **Status:** Pending

#### BUG-034 — Recommendation feeds do not use variant-aware availability

- **File path:** `backend/services/recommendation.service.ts` (`getRecommendedForUser`, `getTrendingProducts`, `getSimilarProducts`, `getFeaturedProducts`, `getNewArrivals`, `getDeals`, `formatProduct`)
- **Description:** Public recommendation queries filter on the base product `stock` only, while variant-aware storefront selection elsewhere treats variant stock as the sellable inventory. A product with base stock zero but an in-stock variant can be omitted; a product with base stock positive but all variants exhausted can be shown; personalized and trending results can also return unavailable products without any stock filter.
- **Severity:** Medium
- **Root cause:** Recommendation queries and response formatting were not updated with the variant availability model.
- **Recommended fix:** Apply a tenant-scoped base-or-variant availability predicate to every public recommendation source, include tenant-scoped variants in the formatter, and report the effective available stock consistently.
- **Status:** Pending

#### BUG-035 — Profile image uploads trust the client MIME type and orphan prior public objects

- **File path:** `frontend/src/app/api/account/settings/route.ts`, `backend/lib/storage.ts`
- **Description:** The profile endpoint checks only `File.type` and size before uploading bytes to the public bucket; it does not verify the file signature as the product and verification upload paths do. Each replacement creates a new object and overwrites `User.image` without retiring the previous profile object, causing unbounded orphaned public files.
- **Severity:** Medium
- **Root cause:** Profile uploads use a separate validation path and have no replacement cleanup/compensation logic.
- **Recommended fix:** Validate magic bytes against the declared image type, retain the previous image URL, delete the prior profile object after a successful database update, and delete the newly uploaded object if the database update fails.
- **Status:** Pending

#### BUG-036 — Password-reset bearer tokens are stored in plaintext

- **File path:** `frontend/src/app/api/auth/forgot-password/route.ts`, `frontend/src/app/api/auth/reset-password/route.ts`
- **Description:** The raw reset token placed in the email URL is stored directly in `VerificationToken.token`. Anyone who obtains a database read can use an unexpired token to reset an account without needing the email.
- **Severity:** High
- **Root cause:** The password-reset flow has no one-way token hash, unlike the email-verification code flow.
- **Recommended fix:** Store only a keyed one-way digest of the reset token, query by the digest, use a reset-specific identifier namespace, bound the token input, and consume the record after a successful reset.
- **Status:** Pending

#### BUG-037 — Invitation email HTML and link origin are not safely constructed

- **File path:** `frontend/src/app/api/manage/team/invitations/route.ts`
- **Description:** Merchant-controlled store text is interpolated into HTML without escaping. The invitation URL is built from the request URL, so an untrusted Host header or proxy origin configuration can produce an invitation link pointing to an attacker-controlled host.
- **Severity:** Medium
- **Root cause:** Email rendering lacks an HTML escaping boundary and public-link construction trusts request-origin data.
- **Recommended fix:** Escape all merchant-controlled HTML values, construct links from a validated configured public app URL (with a clearly bounded development fallback), and add regression tests for hostile store names and hosts.
- **Status:** Pending

#### BUG-038 — Catalog identifiers remain globally unique across tenants

- **File path:** `backend/prisma/schema.prisma` (`Category`, `Product`, `Variant`); new migration required
- **Description:** Category name/slug, product slug/SKU, and variant SKU retain global `@unique` constraints even though catalog queries and public URLs are tenant-scoped. Two legitimate merchants cannot independently use the same slug or SKU, and creation/import can fail with a uniqueness error caused by another tenant.
- **Severity:** Medium
- **Root cause:** The multi-tenant schema added tenant indexes/triggers but did not replace legacy global uniqueness with tenant-scoped uniqueness.
- **Recommended fix:** Remove the global uniqueness attributes, add tenant-scoped composite unique constraints/indexes, check existing duplicate data before migration, and preserve explicit handling for legacy nullable global rows.
- **Status:** Pending

#### BUG-039 — Stock movement history counts unpaid orders as sales

- **File path:** `backend/services/inventory.service.ts` (`getStockMovementHistory`)
- **Description:** The movement query excludes cancelled orders but does not require a completed payment, so pending, failed, or otherwise unpaid order items are reported as `SALE` movements. This can mislead stock/revenue reconciliation and reorder decisions.
- **Severity:** Medium
- **Root cause:** The movement query lacks the settled-payment predicate used by the inventory velocity query.
- **Recommended fix:** Restrict sale movements to non-cancelled orders with at least one completed payment, and add a regression case for pending and failed orders.
- **Status:** Pending

#### BUG-040 — Inventory alerts suppress all but one low-stock variant per product

- **File path:** `backend/services/inventory.service.ts` (`getStockAlerts`)
- **Description:** The variant alert query uses `take: 1`, so a product with multiple exhausted/low-stock variants produces only one alert and hides the remaining actionable inventory conditions.
- **Severity:** Low
- **Root cause:** A query-level limit was used to reduce payloads without preserving one alert per matching variant.
- **Recommended fix:** Fetch all matching tenant-scoped variants or aggregate deliberately while retaining each variant's identity, then add coverage for multiple affected variants.
- **Status:** Pending

#### BUG-041 — Reorder suggestions use base-product velocity for variant inventory

- **File path:** `backend/services/inventory.service.ts` (`getReorderSuggestions`)
- **Description:** The service calculates sales velocity only by product because order items store the selected variant as text, then applies that product-level velocity and base stock to products that have variants. It can therefore suggest reordering the non-sellable base stock while variant stock is the actual inventory, and it cannot prioritize variant replenishment from the variant's own sales.
- **Severity:** Medium
- **Root cause:** Variant identity is not carried into the order-item aggregation used by reorder reporting, but the base-product suggestion is still emitted for variant products.
- **Recommended fix:** Do not emit a base-stock suggestion for variant products; preserve variant-specific stock alerts, and add a durable variant identifier to order items in a compatible schema migration so future velocity can be calculated per variant.
- **Status:** Pending

#### BUG-042 — Payment finalization can overwrite a concurrent order cancellation

- **File path:** `backend/payments/cards/index.ts`, `backend/payments/mpesa/index.ts`, `backend/payments/webhooks/index.ts`
- **Description:** Payment verification and webhook reconciliation first read the order, then update it by ID to `CONFIRMED` without requiring the order to remain `PENDING`. A cancellation that commits between those operations can be overwritten by a late provider response.
- **Severity:** High
- **Root cause:** Order finalization is not an atomic compare-and-set transition.
- **Recommended fix:** Claim the transition with an atomic tenant-scoped update requiring `status = PENDING`; only send confirmation after that claim succeeds, and make an already-finalized/cancelled order non-mutating.
- **Status:** Pending

### Cycle 7 audit conclusion before repair

The source findings above were recorded before any cycle 7 application or migration repair. The payment amount trace and route/controller authorization trace did not reveal additional defects in those paths. Cycle 7 is therefore not a clean audit: BUG-016 is re-opened and BUG-033 through BUG-040 are pending. Repair must proceed in severity order, followed by automated checks, managed Playwright, and two fresh post-repair full audits.

## Fresh full audit cycle 10 — 2026-08-31

Cycle 10 was run as a separate repository-wide verification pass after cycles 8 and 9. No application source was modified during this audit. The review covered the complete file inventory, API route wrappers and controller authorization delegation, tenant-scoped Prisma access patterns, payment and order finalization paths, upload and token boundaries, schema/migration validity, dangerous-code patterns, existing regression tests, build output, and browser smoke configuration.

### Cycle 10 source findings

No new confirmed source defects were discovered. All 42 findings in the authoritative status register remain `Verified`; no Critical, High, Medium, or Low finding was reopened.

The fresh scan found only previously documented non-blocking signals:

- 79 ESLint warnings (unused symbols, legacy hook dependencies, explicit `any` in presentation/admin surfaces, and image optimization suggestions), already represented in the warning/maintainability backlog.
- Webpack cache snapshot warnings and Node `url.parse()` deprecation warnings during build.
- Provider/database-unavailable fallback logs in tests and local execution; these are environment limitations, not new source defects.

### Cycle 10 verification evidence

| Check | Result | Evidence / limitation |
|---|---|---|
| Repository inventory and dangerous-pattern scan | PASS | 346 application/backend/test/script files scanned; only the expected root theme bootstrap JSON-LD and backup script process spawn matched the guarded-pattern search. |
| API authorization/tenant-boundary scan | PASS (source) | Legacy controller routes delegate to `requireStoreAccess` or explicit session, tenant-resolution, and permission checks; direct tenant ownership predicates remain present in reviewed account, catalog, order, payment, support, analytics, and platform paths. |
| `npx prisma validate --schema backend/prisma/schema.prisma` | PASS | Prisma 6.19.3 accepted the schema with a placeholder local `DATABASE_URL`; this proves schema validity only, not live migration application. |
| `npm run type-check` | PASS | Frontend TypeScript and backend `tsc` completed with exit code 0. |
| `npm run lint` | PASS WITH WARNINGS | 0 errors and 79 warnings; warning categories match the documented backlog. |
| `npm test` | PASS | 65 tests passed, 0 failed, 0 skipped. Expected missing-provider and unavailable-local-DB logs were emitted by fallback tests. |
| `npm run build` | PASS WITH WARNINGS | Prisma client generated, Next.js production build completed, and 137 routes were generated. The configured Neon endpoint was unreachable during database-backed fallback paths; webpack cache and Node deprecation warnings remain. |
| `npm audit --omit=dev --audit-level=high --json` | NOT VERIFIED | The audit command could not complete in this environment; no clean or vulnerable dependency conclusion is inferred. |
| `npm run test:e2e` | ENVIRONMENT-LIMITED | Playwright started the local Next.js server, but the run stalled while application/database-backed pages waited on the unreachable configured Neon endpoint and was stopped cleanly. Authenticated, seeded tenant, billing, and provider flows remain unverified without live services. |
| `git diff --check` | PASS | No whitespace errors were reported. |

### Cycle 10 conclusion

The source audit is clean for new findings, and cycles 8, 9, and 10 are consecutive no-new-source-finding audits. This does not establish that the deployed SaaS is bug-free: live Neon migration/schema verification, seeded cross-tenant attack tests, provider callbacks, storage policy, email/SMS/WhatsApp delivery, and authenticated browser workflows still require an available staging environment.

## Fresh post-repair full audit cycles 12 and 13 — 2026-10-08

### Cycle 12 — repaired-path and repository-wide verification

The post-repair scan re-read every changed implementation and its callers, reviewed the complete `saas-staging` source/test/docs inventory, and repeated checks of tenant scoping, industry-specific copy/controls, CSV import/export transaction and validation paths, spreadsheet formula handling, authentication route contracts, build/lint/type/test scripts, and known API/payment/auth boundaries. No new confirmed source finding was discovered. BUG-043 through BUG-049 were verified against the implementation and regression evidence.

### Cycle 13 — independent repeat scan

The source inventory, API authorization and tenant-access delegation, product/catalog mutations, active-industry behavior, payment and webhook state transitions, authentication/token paths, upload boundaries, schema/migration alignment, regression tests, and changed-file consumers were scanned again without application-source edits. No new confirmed source finding was discovered and no finding was reopened. Cycles 12 and 13 are the required two consecutive post-repair full audits with no new findings.

### Post-repair verification evidence

| Check | Result | Evidence / limitation |
|---|---|---|
| `npm test` | PASS | 128 passed, 0 failed, 0 skipped. Expected provider-not-configured and unreachable localhost PostgreSQL logs came from fallback/webhook tests. |
| Focused regression suite | PASS | 22 passed, 0 failed, covering industry CSV attributes, formula neutralization, warranty/copy isolation, OTP timing, and current platform hero contract. |
| `npm run lint` | PASS WITH WARNINGS | 0 errors, 83 existing warnings (unused symbols, legacy hook dependencies, explicit `any` in presentation/admin UI, and image optimization suggestions). |
| `npm run type-check` | PASS | Frontend TypeScript and backend `tsc` completed successfully. |
| `npm run build` | PASS WITH WARNINGS | Prisma client generated and all 166 pages/routes built. Configured Neon was unreachable during static store-directory data access; fallback behavior allowed build completion. Webpack cache and Node `url.parse()` warnings remain. |
| `npm run test:e2e` | PASS / provider test skipped | With the dev server started separately, Playwright exited cleanly: 1 Chromium catalog/search/checkout-auth-gate smoke passed; provider sandbox test skipped because `E2E_PAYMENT_PROVIDER` is unset. Database-backed product requests returned fallback/unavailable responses because Neon was unreachable. |
| `git diff --check` | PASS | No whitespace errors. Windows line-ending conversion notices only. |
| Database/deployment boundary | PASS | No migration, seed, database write, push, or deploy was run. |

### Remaining operational verification gates

The code audit is complete, but a live database/provider production gate is not claimed. The configured Neon endpoint was unreachable; migration application, live catalog/demo-store contents, authenticated cross-tenant browser attacks, provider callbacks/delivery, R2 access policy, and production deployment remain unverified. Provider E2E coverage was skipped as configured. The 83 lint warnings and build deprecation/cache warnings are non-blocking recorded debt, not newly confirmed defects.

## Fresh audit cycle 18 — four-industry tenant-state isolation

The follow-up review found two browser-local state keys that were not scoped to the active store. They are recorded before implementation changes; live Neon and authenticated browser verification remain unavailable.

### BUG-067 — Compare selections are shared by every electronics storefront

- **File path:** `frontend/src/app/compare/page.tsx`
- **Description:** Electronics storefronts all read and write the same `novatech-compare` localStorage key. Switching between two electronics merchants in one browser can show the first merchant's compared products in the second merchant's comparison page.
- **Severity:** Medium
- **Root cause:** The storage key is selected by industry rather than store identity.
- **Recommended fix:** Use a store-specific key for every industry; do not import the old shared electronics list because its owning tenant cannot be determined safely.
- **Status:** Fixed — every industry now uses a store-ID-scoped key; the legacy shared list is not imported.

### BUG-068 — Store design local-preview drafts are shared across tenants

- **File path:** `frontend/src/app/manage/design/page.tsx`
- **Description:** When settings cannot be loaded or saved remotely, the design editor uses one global localStorage key. An offline/unavailable-database draft created in one storefront can appear in another store's admin editor in the same browser.
- **Severity:** Medium
- **Root cause:** Local draft persistence is not keyed by the resolved store identity, and the initial load effect does not track store changes.
- **Recommended fix:** Scope the local draft key and its load effect to `store.storeId`; leave the legacy unscoped key untouched because it has no reliable tenant owner.
- **Status:** Fixed — local design drafts are store-ID-scoped and reload when the active store changes; the legacy global draft is not imported.

## Cycle 19 — settlement race re-audit — 2026-10-09

The re-audit of the outstanding payment/concurrency findings exposed an additional interleaving within BUG-050: settlement could read `PENDING`, lose its compare-and-set to a concurrent cancellation, then classify the payment using the stale pre-claim status. The finding was recorded in BUG-050 before the repair. `finalizePendingOrderPayment` now re-reads the committed order state after a lost claim before assigning `REFUND_REQUIRED_ORDER_CANCELLED` versus `REVIEW_REQUIRED` metadata. The isolated database-mock regression covering this interleaving passes; it does not substitute for live PostgreSQL concurrency validation.

### Cycle 19 verification

| Check | Result | Evidence / limitation |
|---|---|---|
| Settlement race regression | PASS | 3 order-settlement tests pass, including cancellation winning between initial read and compare-and-set. |
| `npm test` | PASS | 146 passed, 0 failed, 0 skipped; webhook fallback tests logged expected unavailable-local-PostgreSQL errors. |
| `npm run lint` | PASS WITH WARNINGS | 0 errors, 83 warnings. |
| `npm run type-check` | PASS | Frontend TypeScript and backend `tsc` completed with exit code 0. |
| `npm run build` | PASS WITH WARNINGS | All 166 routes built; configured Neon was unreachable during read-only static store-directory lookup. No migration, seed, or database write was run. |
| `npm run test:e2e` | PASS WITH ENVIRONMENT LIMITATION | With a separately started local server: 1 Chromium catalog/search/unauthenticated-checkout smoke passed, 1 provider sandbox test skipped. Product APIs returned 503 because Neon was unreachable, so live catalog content was not exercised. |
| Dangerous API/runtime pattern scan | PASS (source search) | Only the fixed theme bootstrap `dangerouslySetInnerHTML` matched; no eval, Function constructor, unsafe Prisma raw query, TLS-verification disable, or TypeScript suppression directives matched. |
| `git diff --check` | PASS | Only line-ending notices. |

Cycle 19 is not a clean full-codebase audit: it fixed a new race in the existing high-severity BUG-050 scope. A separate independent audit pass after this repair is still required, followed by one more consecutive clean pass. Live Neon/provider verification also remains open.

### BUG-069 — Browser catalog smoke accepts an unavailable/empty API as success

- **File:** `tests/e2e/checkout.spec.ts`
- **Description:** The catalog smoke accepts `/api/products` returning no products as a passing search assertion. During this audit the configured Neon database was unreachable and the product endpoint returned 503, yet the browser test still passed. It therefore does not prove that a catalog item renders or that search filters a real result.
- **Severity:** Low
- **Root cause:** The assertion treats the empty/error-state copy as equivalent to a successful product search.
- **Recommended fix:** Intercept the product endpoint with deterministic browser fixtures and assert that a known product renders before search and that an unrelated query removes it, while retaining the separate auth-gate assertion.
- **Status:** Verified — the browser smoke uses deterministic product fixtures and asserts both product rendering and query-driven filtering; Playwright passes.

## Cycle 20 — browser smoke assertion hardening — 2026-10-09

BUG-069 was repaired by making catalog responses deterministic in the Playwright test. The smoke now requires a known product to render, verifies a non-matching query empties the results, restores the matching result, and then checks the protected checkout gate. This prevents a 503/empty database fallback from being mistaken for a working catalog search. Targeted Playwright completed with 1 passed and the provider-dependent test skipped. The smoke intentionally does not establish live catalog data, tenant CRUD, auth flows, or provider behavior.

Cycle 20 found and fixed BUG-069, so it is not a clean no-new-findings full audit and does not count toward the two-consecutive-clean-audit gate.

### BUG-070 — Explicit `any` types remained in frontend/admin and verification code

- **Files:** `frontend/src/app/admin/customers/page.tsx`, `frontend/src/app/admin/deliveries/page.tsx`, `frontend/src/app/admin/messages/page.tsx`, `frontend/src/app/admin/security/page.tsx`, `frontend/src/app/api/manage/verification/route.ts`, `frontend/src/app/api/manage/verification/evidence/route.ts`, `frontend/src/app/platform/verification/[tenantId]/page.tsx`, `frontend/src/app/manage/billing/page.tsx`
- **Description:** A strict frontend ESLint pass found 31 explicit-`any` errors in user/API data and catch paths. These erased compile-time guarantees at admin, billing, and sensitive verification boundaries and conflicted with the project's multi-industry type-safety acceptance criterion. Typing the billing snapshot also revealed the separate response-shape defect BUG-071.
- **Severity:** Low
- **Root cause:** Admin pages and merchant verification code use broad `any` instead of narrow response types or `unknown` plus runtime narrowing.
- **Recommended fix:** Replace explicit `any` with explicit interfaces and safe `unknown` narrowing, retaining current behavior and endpoint contracts; rerun strict lint, type-check, tests, and build.
- **Status:** Verified — admin and verification response data now use explicit narrow interfaces or inferred service response types; caught errors are `unknown` and narrowed. The complete frontend strict `@typescript-eslint/no-explicit-any:error` lint passed.

### BUG-071 — Setup-fee billing UI reads its record from the wrong response level

- **File:** `frontend/src/app/manage/billing/page.tsx`
- **Description:** `getBillingSnapshot()` returns the setup-fee record as `tenant.billingRecord`, but the page read `data.billingRecord`. As a result, setup-fee state appeared as `PENDING` with a zero amount and `setupFeePending` was always false, which could hide the setup-fee payment action for a merchant whose setup fee was still due.
- **Root cause:** `BillingData` used `any`, so the frontend declaration did not reflect the inferred service response shape and the incorrect top-level property was not caught by TypeScript.
- **Recommended fix:** Type the page response from `getBillingSnapshot()` and read the setup-fee status, amount, and currency through `data.tenant.billingRecord`.
- **Severity:** Medium
- **Status:** Verified — page uses the service-inferred billing snapshot type and reads the nested record. Frontend type-check and production build pass.

## Cycle 21 — API authorization trace and strict frontend typing — 2026-10-09

The post-transfer API scan enumerated the mutation route files and traced delegated order, review, product, inventory, support, and admin handlers into their session, permission, tenant, and ownership checks. In the reviewed paths, user address/notification mutations include both user and resolved tenant scope; product, order, inventory, and support mutations delegate to store permission checks and tenant-scoped services; platform mutation routes use the platform access helper. No new authorization bypass was confirmed in this pass. The source scan is not a substitute for authenticated cross-tenant attack tests against a reachable seeded database.

The strict no-`any` pass exposed eight additional billing-page `any` annotations beyond the 23 recorded earlier, bringing BUG-070 to 31 explicit annotations across eight files. Replacing the billing declaration with `Awaited<ReturnType<typeof getBillingSnapshot>>` surfaced BUG-071: setup-fee state was read at the wrong response level. The page now reads `tenant.billingRecord`, preserving the existing billing service response and restoring the setup-fee status/amount/action behavior. This pass discovered a new medium finding, so it does not count as a clean audit.

| Check | Result |
|---|---|
| `npm test` | PASS — 146 passed, 0 failed, 0 skipped; mocked webhook tests logged expected unavailable-local-Postgres diagnostics. |
| `npm run lint` | PASS — 0 errors, 60 warnings. |
| Strict frontend no-explicit-`any` lint | PASS — no violations. |
| `npm run type-check` | PASS — frontend TypeScript and backend `tsc`. |
| `npm run build` | PASS — all 166 routes generated; read-only Neon store-directory lookup fell back after connection failure. |
| `git diff --check` | PASS — no whitespace errors; line-ending notices only. |
| Database / git remote | NOT TOUCHED — no database write, migration, seed, commit, push, or deployment. |

Two consecutive independent full source audits after all fixes are still required. The required broad Playwright authentication, registration, login/logout, protected-route, settings, mobile navigation, CRUD, and billing flows have not yet been completely exercised; provider and live database workflows remain environment-limited.

### BUG-072 — Tenant-isolation regression tests bypass TypeScript checking with explicit `any`

- **Files:** `tests/tenant/tenant-foundation.test.ts`, `tests/tenant/recommendation-isolation.test.ts`, `tests/tenant/inventory-isolation.test.ts`
- **Description:** The tenant-resolution, recommendation-isolation, and inventory-isolation tests replace Prisma methods using explicit `any` casts and untyped callback arguments. This suppresses type checking on the test doubles and query `where` objects, allowing mistakes in test setup or assertions to compile and reducing confidence in a critical authorization invariant.
- **Root cause:** Tests monkey-patch overloaded generated Prisma methods directly and use `any` to bypass their generic signatures.
- **Recommended fix:** Replace untyped monkey-patches with narrow typed mock adapters/callback argument types (using `unknown` and explicit guards where needed), preserve restore behavior, and run the focused tests plus the complete suite and strict type check.
- **Severity:** Low
- **Status:** Verified — test mocks now use a shared restore-safe helper and narrow callback parameter shapes. All 10 focused tenant tests and all 146 unit tests pass; `tests/tenant/tsconfig.json` provides strict test-project type checking and passes. Repository TypeScript source/tests contain no explicit `any` annotations.

## Cycle 22 — tenant-test type-safety repair — 2026-10-09

BUG-072 was repaired after being recorded: three tenant-isolation test files now use a shared mock helper that restores Prisma methods in `finally`, narrow argument shapes, and an `unknown`-typed error predicate. Added a dedicated strict TypeScript project for the tenant tests because the regular application type-check does not include the test tree. The dedicated test type-check passes; 10 focused tenant tests and the 146-test full suite pass. A repository-wide scan of TypeScript source/tests finds no explicit `any` types. Cycle 22 fixed a newly discovered issue and therefore is not a clean no-new-findings audit. Independent full audits after all repairs remain outstanding.

### BUG-073 — Browser smoke coverage omits auth pages, protected workspace redirects, and mobile navigation

- **File:** `tests/e2e/checkout.spec.ts`
- **Description:** The existing Playwright suite exercised a deterministic product search and the checkout sign-in gate, but did not verify that the standalone sign-in/sign-up pages render, unauthenticated requests to admin/store-management routes are redirected to the correct portal sign-in, or the platform mobile navigation opens and exposes its expected links. These are explicit user-flow gates in this handoff.
- **Root cause:** The browser suite had only one general UI smoke plus an optional provider contract test; there were no assertions for these common public/protected navigation flows.
- **Recommended fix:** Extend deterministic browser coverage to sign-in/sign-up rendering and links, unauthenticated admin/manage redirects, and platform mobile navigation. Keep database-dependent successful authentication and authenticated CRUD explicitly marked unverified while Neon is unavailable.
- **Severity:** Low
- **Status:** Verified — the expanded Chromium smoke asserts both protected portal redirects, the sign-up page and link, and mobile platform navigation open/close state; both deterministic browser flows pass. Successful database-backed auth and provider flows remain separate environment gates.

## Cycle 23 — auth/protected-route/mobile browser smoke coverage — 2026-10-09

BUG-073 was repaired after being recorded. The expanded Playwright suite now verifies the deterministic product search and checkout gate, standalone sign-in/sign-up flow and callback-preserving sign-up link, unauthenticated admin and store-management redirects with correct portal messages, and platform mobile navigation opening, rendering Home/Plans, and closing. Playwright exited cleanly with 2 passed and 1 provider-dependent test skipped. Neon remained unreachable, so successful registration/login/logout, authenticated CRUD/billing, and live provider workflows were not exercised. Cycle 23 fixed a newly identified test-coverage issue and is not a clean full audit.

### BUG-074 — Public credential registration bypasses the signup consent requirement

- **Files:** `frontend/src/app/auth/signup/page.tsx`, `frontend/src/app/api/auth/register/route.ts`, `backend/validators/authValidator.ts`
- **Description:** The signup UI marks the Terms, Privacy, and Cookie Policy checkbox as required. Google signup explicitly checks `acceptedTerms`, but credential signup neither checks nor sends that state. The public API's `registerSchema` also omits consent, so direct callers can create an account without accepting the documents, bypassing the visible browser control.
- **Root cause:** Consent is enforced only by native browser form validation and the Google-provider client handler; the credential request contract/server validator do not include it.
- **Recommended fix:** Require `acceptedTerms: true` in the API schema, send it from credential signup, and provide a clear client-side message before starting the request. Add regression tests that missing/false consent is rejected and true consent is accepted. Do not infer or fabricate a persisted legal acceptance record without a schema decision.
- **Severity:** Medium
- **Status:** Verified — missing/false consent is rejected by the registration schema, true consent is accepted, and browser submission without consent is blocked with the app's consent message. No database schema change or acceptance timestamp was introduced.

### BUG-075 — Native checkbox validation suppresses the signup consent message

- **File:** `frontend/src/app/auth/signup/page.tsx`
- **Description:** The credential signup handler now provides a clear consent error, but the checkbox also has the native HTML `required` attribute. Browser constraint validation prevents the form's submit handler from running while it is unchecked, so the custom message cannot appear and the user receives only browser-native feedback.
- **Root cause:** Native constraint validation short-circuits the submit event before the component's existing `acceptedTerms` check.
- **Recommended fix:** Let the submit handler own consent validation, retain the required semantic with `aria-required`, and assert that the app's consent message appears when the checkbox is unchecked.
- **Severity:** Low
- **Status:** Verified — native checkbox blocking was removed while `aria-required="true"` remains; the signup handler renders the consent alert and the full deterministic Playwright suite passes.

## Cycle 24 verification addendum — signup consent and browser validation — 2026-10-09

- BUG-074 now requires credential signup consent at both the client and API validator. Schema tests cover accepted, missing, and false consent. No persisted acceptance timestamp was added because the database/data-retention contract was not part of the authorized change.
- Browser verification exposed BUG-075: native checkbox `required` prevented the component's consent message from rendering. The checkbox now declares `aria-required="true"`, and the handler owns the accessible feedback; Playwright submits the form unchecked and verifies the message.
- Final checks: 146 unit tests passed; lint passed with 0 errors and 60 warnings; application and dedicated tenant-test type checks passed; Playwright passed 2 deterministic Chromium flows with 1 provider-dependent test skipped; optimized production build passed and generated all 166 routes.
- Neon was unreachable during build, so store-directory generation used its existing fallback. No database write, migration, seed, commit, push, or deployment was run. The three remaining in-progress findings are BUG-050, BUG-052, and BUG-060, all requiring live verification.
- Cycle 24 discovered and repaired BUG-074 and BUG-075; it is not a clean audit cycle and does not count toward the required two consecutive full audits with no new findings.

### BUG-076 — Backup verification does not prevent restoring onto its source database

- **File:** `scripts/verify-backup.mjs`
- **Description:** The script accepts `BACKUP_DATABASE_URL` and `RESTORE_DATABASE_URL` without checking their database identities, then executes `pg_restore --clean --if-exists` against the restore URL. If both URLs identify the same host, port, and database (even if credentials or query parameters differ), the verification operation can drop and recreate objects in the source database.
- **Root cause:** Destructive restore is invoked without a source/target separation guard.
- **Recommended fix:** Compare normalized PostgreSQL host/port/database identities and fail before creating a dump or launching `pg_dump` when source and target resolve to the same database. Add deterministic tests for same-database URL variants and distinct targets.
- **Severity:** High
- **Status:** Verified — normalized source/target identity comparison rejects the same host/port/database regardless of credentials or irrelevant query options; four focused tests and the full suite pass. The guard executes before temporary dump creation or child-process launch. The backup utility was not run against a database.

## Cycle 25 — post-repair full source audit — 2026-10-09

The post-cycle-24 scan rechecked repository scripts/configuration alongside the existing application, database, auth, API, multi-industry, payment, test, and report surfaces. The backup restore helper exposed BUG-076 before any script execution. The issue is recorded above before repair. This new finding means cycle 25 is not a clean audit and does not count toward the two-consecutive-clean-audit requirement.

## Cycle 26 — independent post-repair React/API audit — 2026-10-09

The independent post-cycle-25 review rechecked effect dependencies and asynchronous request lifecycles across admin filtering/search and the tenant-specific platform verification review page. It confirmed two response-order defects and recorded them before any source edits. The React lint inventory also included effects whose primitive dependencies intentionally match their captured filter values; those warnings were not treated as defects without a behavior failure.

### BUG-078 — Filtered admin requests can apply stale responses after a newer selection

- **Files:** `frontend/src/app/admin/analytics/page.tsx`, `frontend/src/app/admin/coupons/page.tsx`, `frontend/src/app/admin/deliveries/page.tsx`, `frontend/src/app/admin/enquiries/page.tsx`, `frontend/src/app/admin/messages/page.tsx`, `frontend/src/app/admin/support/page.tsx`
- **Description:** These pages start fetches as time-range, status, category, or search filters change, but do not cancel or sequence the requests. If an earlier response is slower, it can overwrite the latest response and show metrics or records that do not match the currently selected filter. In analytics this can misstate financial reporting; in admin lists it can present the wrong records for a subsequent action.
- **Root cause:** Each response writes state unconditionally without checking that its filter/request is still current.
- **Recommended fix:** Add per-page latest-request sequencing or abortable requests, guard both success and error/loading state updates, and retain intended filter dependencies. Add deterministic tests proving out-of-order responses cannot replace the current selection.
- **Severity:** Medium
- **Status:** Verified — the six loaders now use a shared latest-request guard for response and error state, and effect cleanup invalidates outstanding requests. The guard's out-of-order and invalidation behavior passes two focused unit tests; the full application type-check and build pass.

### BUG-079 — Stale verification response can display another tenant on a changed review URL

- **File:** `frontend/src/app/platform/verification/[tenantId]/page.tsx`
- **Description:** The review effect reloads when `tenantId` changes, but earlier requests are neither aborted nor checked against the current route. A slower response for tenant A can finish after tenant B's request and set A's verification profile/evidence under B's URL. This risks cross-tenant information being shown to a platform operator and encourages decisions against the wrong merchant.
- **Root cause:** `load()` writes the response unconditionally and route changes do not clear/guard prior tenant data.
- **Recommended fix:** Abort or sequence verification loads by tenant ID, clear the previous tenant record on route changes, and ignore stale success/error/finally updates. Test A-to-B navigation with deliberately out-of-order responses.
- **Severity:** Medium
- **Status:** Verified — verification responses are latest-request guarded, effect cleanup invalidates in-flight work, and rendering checks that the returned tenant ID matches the current route. Application type-check and production build pass.

### BUG-080 — Signup consent feedback browser assertion fails on an unchecked submission

- **File:** `tests/e2e/checkout.spec.ts`; signup behavior in `frontend/src/app/auth/signup/page.tsx`
- **Description:** The browser flow fills valid name, email, matching password fields and submits without checking consent, but the expected custom consent message does not appear within five seconds. The signup remains on screen and its checkbox is unchecked. This contradicts BUG-075's recorded browser verification and means the required consent UX is not currently demonstrated.
- **Root cause:** Not yet confirmed; isolate form validity/submission and the component's consent-handler state update before changing the test expectation.
- **Recommended fix:** Preserve the requirement that unchecked credential registration is blocked; repair the component or browser interaction based on the observed submission path, then rerun the complete browser suite.
- **Severity:** Medium
- **Status:** Pending — recorded before further browser-test or UI changes.

### BUG-077 — Signup navigation E2E uses a timeout shorter than the database-unavailable render path

- **File:** `tests/e2e/checkout.spec.ts`
- **Description:** The signup link points to the expected `/auth/signup` URL and repeated direct browser checks render the page, but the E2E flow intermittently times out after the default five seconds while the server-rendered route is delayed by the unavailable Neon database fallback. The failure snapshot remains on sign-in at the timeout; a later navigation succeeds.
- **Root cause:** The test asserts heading visibility immediately after clicking and uses Playwright's short default assertion timeout instead of first waiting for the route transition with an environment-appropriate bound.
- **Recommended fix:** Assert that the URL transitions to `/auth/signup` with a bounded 15-second timeout, then assert the page heading. Keep the URL assertion so an actually broken link still fails.
- **Severity:** Low
- **Status:** Verified — the test awaits the expected signup URL for up to 15 seconds before checking its heading; the complete suite passes with the Neon-unavailable fallback. The bounded URL assertion still detects a broken route.

## Cycle 25 verification addendum — backup guard and browser stability — 2026-10-09

- BUG-076 is verified by four deterministic identity tests (same URL, differing credentials/query, distinct DB/host/port, malformed/non-PostgreSQL values). The script invokes the guard before creating a temporary directory or launching `pg_dump`/`pg_restore`; no database was contacted.
- BUG-077 is verified by a complete Playwright rerun: 2 Chromium flows passed, including the consent feedback and protected redirects; the provider test was skipped because `E2E_PAYMENT_PROVIDER` is unset. The signup test waits for the route with a bounded timeout.
- Validation after BUG-076: `npm test` passed 150/150; lint passed with 0 errors and 60 warnings; app/backend type checks, tenant test type check, strict frontend no-`any` lint, and production build passed. The build generated all 166 routes; the read-only Neon store-directory fetch used its fallback after the endpoint was unreachable.
- Cycle 25 discovered BUG-076 and BUG-077 and repaired both, so it is not a clean audit. BUG-050, BUG-052, and BUG-060 remain pending live database/provider evidence. The two consecutive full post-repair audits remain outstanding.

## Cycle 26 verification addendum — stale request guards and full checks — 2026-10-09

- BUG-078 and BUG-079 are verified at source level. The request guard unit tests pass 2/2, the full application/backend type-check passes, and the production build completes with all 166 routes.
- `npm test` passes 152/152. `npm run lint` passes with 0 errors and 53 warnings. `git diff --check` passes; only line-ending notices were emitted.
- Playwright is not currently green: the first full run passed the catalog flow but failed the auth/signup flow; a targeted rerun exceeded its 60-second test timeout during signup navigation. The current Neon host was unreachable and fallback reads delayed page rendering. BUG-080 remains pending; do not claim the unchecked-consent browser feedback passed on this run.
- No database migration, seed, write, commit, push, or deployment was run. `frontend/src/lib/demo-store-config.ts`, `.env.local`, and `frontend/.env.local` remain unchanged.
- Cycle 26 found BUG-080 and does not count as a clean audit. Two consecutive complete post-repair audits remain outstanding; live database/provider and authenticated staging gates are still open.
