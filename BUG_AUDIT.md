# Project Bug Audit

Status: ongoing project-wide audit on saas-staging; latest repair recorded in Cycle 43; see the authoritative status register below
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
| BUG-080 | Verified | Targeted Chromium signup flow confirms the accessible consent feedback appears after an unchecked submission. |
| BUG-081 | Fixed | Android checks the persisted DownloadManager request on resume and routes a completed APK to the installer; Java compile and local APK packaging passed, but device verification remains open. |
| BUG-082 | Fixed | Main-frame HTTP 5xx responses no longer enter the opaque no-CORS offline retry loop; device network-recovery verification remains open. |
| BUG-083 | Fixed | Native system-bars bridge persists the current five-color site palette; the bundled fallback validates and applies it, with browser and packaged APK asset checks passing. Physical Android rendering remains unverified. |
| BUG-084 | Fixed | Native DownloadManager status lets the update prompt restore retry after a failed or cancelled request; type-check and repository tests pass, but device verification remains open. |
| BUG-085 | Fixed | The app restores a completed pending update and can reopen its verified APK installer; device installation/cancel/reopen verification remains open. |
| BUG-086 | Fixed | Android checkout saves the enquiry before opening WhatsApp via Capacitor Browser; website popup behavior remains intact. Type-check, focused lint, and all 152 repository tests pass; physical-device verification remains open. |
| BUG-087 | Fixed | Stripe invoice webhook processing now propagates Payment upsert errors so the event receipt is marked failed and can be retried; regression test forces the Payment write to fail and checks the receipt state. |
| BUG-088 | Verified | Android update recovery now distinguishes returning from install-permission settings from an already-open installer, and can resume the saved DownloadManager APK after activity recreation. Java compilation and debug APK assembly pass; physical-device verification remains pending. |
| BUG-089 | Verified | Android WebView vertical scrollbar is disabled natively; app-only CSS hides remaining WebView scrollbars behind a platform-gated document class, leaving browser scrollbar styling intact. Production build and versioned staging APK build pass; physical-device rendering remains unverified. |
| BUG-090 | Fixed | Mobile Google OAuth tickets now require an app-held PKCE verifier; mismatched verification does not consume the ticket. Real Google OAuth and device callback behavior remain unverified. |
| BUG-091 | Fixed | Footer platform detection now runs after hydration, aligning Android's Open Website action with server-rendered markup while the website retains Open App. |
| BUG-092 | Verified | Shopper M-Pesa references and status checks are bound to the full server-verified order, payment row, and registered/guest owner; focused regression tests pass. Live Daraja settlement remains unverified. |
| BUG-093 | Verified | Shopper callers can no longer submit payment metadata, and trusted reference/merchant IDs take precedence over metadata from internal callers; focused regression and production build pass. |
| BUG-094 | Verified | Storefront sign-out clears its busy state after either success or failure; regression test, repository type-check, and production build pass. Live authenticated logout remains unverified. |
| BUG-095 | Verified | Shopper card initiation no longer accepts caller metadata; trusted Stripe reference, order ID, and client secret are merged last. Full tests/type-check/build pass; live Stripe checkout remains unverified. |
| BUG-096 | Verified | Native update-download errors now surface in the prompt; the browser APK fallback is used only when the native updater plugin is unavailable. Native installation behavior still needs device verification. |
| BUG-097 | Verified | The Android launch overlay now uses the last saved background/surface/primary palette with brand fallbacks. JDK 21 Android build passes and a version 1.3.13 APK verifies; physical-device rendering remains untested. |
| BUG-098 | In Progress | Cross-origin links using `target="_blank"` navigate inside the only Android WebView instead of opening the external destination separately. |

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
- **Status:** Verified — the targeted Chromium auth/signup flow submits valid credentials without consent and confirms the app's consent message appears. See Cycle 27 verification addendum.

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

## Cycle 27 — Capacitor mobile and website flow audit — 2026-10-11

The current `saas-staging` sources were traced across the Android shell, Next.js application, mobile-specific authentication and navigation, update/download flows, offline fallback, checkout/payment handlers, and image uploads. No live merchant account or provider payment was used. Findings are recorded before source changes.

### BUG-081 — Completed app updates are not recovered after the activity pauses

- **Files:** `android/app/src/main/java/com/nurava/hubstores/MainActivity.java`, `android/app/src/main/java/com/nurava/hubstores/UpdateDownloadReceiver.java`
- **Description:** The download-complete receiver is dynamically registered only while `MainActivity` is resumed and is unregistered in `onPause()`. If Android's DownloadManager finishes while the app is paused or its activity/process is stopped, the completion event is missed. On the next resume, the app registers a receiver but never checks the persisted pending download ID or its DownloadManager status, leaving the APK downloaded without opening Android's installer.
- **Root cause:** Completion handling depends solely on a transient activity receiver; the pending ID is persisted but no resume-time recovery reads it.
- **Recommended fix:** When the activity resumes, check the persisted pending download with DownloadManager and pass a successful matching completion through the same receiver/installer path. Keep Android's required installation confirmation.
- **Severity:** Medium
- **Status:** Fixed — `MainActivity` now rechecks the persisted DownloadManager ID on resume and sends a completed matching download through the same receiver and installer path. The pending ID is retained until the installer opens or install permission is explicitly denied. Android Java compilation passes with a temporary JDK 21. Full APK assembly cannot complete because Gradle cannot fetch Android build plugins under the current network sandbox; physical-device verification also remains pending because no phone is connected.

### Cycle 27 scope and evidence boundary

- Static traces confirm the app uses the same deployed Next.js origin and existing server/API routes. They do not prove the live Google OAuth callback, authenticated session persistence, merchant checkout, external payment callbacks, storage uploads, theme rendering, or network recovery on a physical phone.
- Existing BUG-050, BUG-052, and BUG-060 live database/provider verification remains open as documented above. BUG-080 was reverified by the targeted browser flow below. The full two-consecutive-clean-audits gate is not met.
- Automated repository checks and a deterministic auth/signup/protected-route/mobile-navigation browser flow have been run for this cycle. The production build completed. Android debug APK assembly was blocked because sandbox networking denied Gradle access to Google Maven and Maven Central (`Permission denied: getsockopt`). No database write, migration, seed, payment transaction, push, or deployment has been run.

### BUG-082 — Offline recovery treats HTTP 5xx as restored connectivity and can loop

- **Files:** `android/app/src/main/java/com/nurava/hubstores/MainActivity.java`, `capacitor-shell/offline.html`
- **Description:** `MainActivity` routes main-frame HTTP 5xx responses to the bundled offline page. The offline page probes that URL using `fetch(..., mode: "no-cors")` and treats any resolved promise as success. A cross-origin no-CORS response is opaque even when its HTTP status is 5xx, so the page immediately navigates back to the failing URL and repeats the fallback cycle.
- **Root cause:** The recovery probe cannot inspect a no-CORS response status, while the native layer classifies every main-frame 5xx as offline.
- **Recommended fix:** Keep the offline fallback limited to transport-level WebView connection failures. Do not route HTTP 5xx responses into a page whose no-CORS probe cannot inspect the status.
- **Severity:** Medium
- **Status:** Fixed — the Android WebView client no longer treats main-frame HTTP 5xx responses as internet-offline errors. The offline page is now used for transport-level failures, so its opaque no-CORS response cannot create a 5xx redirect loop. Physical network-loss/recovery behavior still needs device verification.

### BUG-083 — Android offline fallback does not use the active site theme

- **Files:** `capacitor-shell/offline.html`, `android/app/src/main/java/com/nurava/hubstores/MainActivity.java`, `android/app/src/main/java/com/nurava/hubstores/SystemBarsPlugin.java`, `frontend/src/components/providers/AndroidSystemBars.tsx`
- **Description:** The website `OfflineNotice` reads the active theme palette, but the bundled Android offline page hardcodes a navy background and orange icon. When a platform or storefront uses another palette or light mode, the offline fallback visibly switches themes.
- **Root cause:** The offline document is loaded from the APK's `file://` origin and cannot read the remote page's CSS theme. The native bridge currently receives only the bar background color and does not persist a palette for the fallback.
- **Recommended fix:** Persist validated active background, surface, text, muted, and primary colors from the web theme through the native bridge, then pass them as encoded query parameters to the bundled offline document with safe defaults.
- **Severity:** Medium
- **Status:** Fixed — `AndroidSystemBars` sends the active background, surface, text, muted, and primary colors to `SystemBarsPlugin`; the native plugin validates and persists the palette; `MainActivity` passes saved values to the bundled fallback, which only applies six-digit hex colors. Browser runtime checks pass for both valid colors and invalid-value fallback. Android Java compilation and APK packaging pass, and the APK's offline asset SHA-256 matches `capacitor-shell/offline.html`. Physical network-loss behavior remains unverified.

### BUG-084 — Failed app update downloads cannot be retried from the prompt

- **Files:** `android/app/src/main/java/com/nurava/hubstores/AppUpdaterPlugin.java`, `frontend/src/components/providers/AndroidAppUpdatePrompt.tsx`
- **Description:** The prompt sets `downloadStarted` after DownloadManager accepts a request and disables its download button. `UpdateDownloadReceiver` ignores failed/cancelled requests, and the web layer never queries DownloadManager status, so it remains stuck on “Download started” and cannot retry until the app or route reloads.
- **Root cause:** The plugin returns only the request ID and has no status method or callback; failure broadcasts are discarded before React can clear its started state.
- **Recommended fix:** Expose a scoped native status query for the active DownloadManager request, poll it while a native download is pending, and restore the retry action with an actionable message when the request fails or is cancelled.
- **Severity:** Medium
- **Status:** Fixed — `AppUpdaterPlugin.getDownloadStatus` now reports the matching DownloadManager request state, and the prompt polls it to restore the retry action after a failed or cancelled request. Frontend/backend type-check and all 152 repository unit tests pass. Runtime validation on a physical Android device remains pending.

## Cycle 28 — Offline fallback theme synchronization — 2026-10-11

### Cycle 28 verification

- `npm test`: PASS, 152/152. Webhook tests emitted expected database-unavailable diagnostics because the local PostgreSQL service is not running.
- `npm run type-check`: PASS for frontend and backend.
- `npm run lint`: PASS, 0 errors and 54 existing warnings; backend TypeScript build also passed.
- Production `npm run build`: PASS; optimized Next.js build generated all 169 static pages. The configured Neon endpoint was unreachable during store-directory generation, so the existing fallback was used. Existing webpack cache and Node URL deprecation warnings remain.
- Android `:app:compileDebugJavaWithJavac`: PASS using temporary Temurin JDK 21.
- `npm run android:sync`: PASS; both Capacitor app and browser plugins were detected. The synced Android offline asset SHA-256 matches the source file.
- Android `:app:assembleDebug`: PASS. The APK includes `assets/public/offline.html` with the same SHA-256 as the source. The APK is local only; the public staging APK and manifest were not replaced or deployed.
- Chromium runtime check of `capacitor-shell/offline.html`: PASS for applying a valid light palette and retaining defaults for malformed colors. The matching Playwright spec was added; its configured test run did not return a result after the local web server repeatedly queried unreachable Neon, so the spec itself is not claimed as a Playwright-suite pass.
- Live Neon, Google login/logout with a real account, M-Pesa/Stripe provider settlement, object-storage uploads, device offline recovery, Android update installation, and physical system-bar rendering remain unverified. ADB has no connected phone.
- Cycle 28 fixed BUG-083 and therefore does not count as a clean full audit. The two consecutive clean full-audit gate remains outstanding.

## Cycle 29 — Update installation recovery and mobile integration audit — 2026-10-11

### BUG-085 — Dismissing Android's installer leaves the update prompt stuck

- **Files:** `android/app/src/main/java/com/nurava/hubstores/AppUpdaterPlugin.java`, `android/app/src/main/java/com/nurava/hubstores/MainActivity.java`, `frontend/src/components/providers/AndroidAppUpdatePrompt.tsx`
- **Description:** After DownloadManager reports a successful APK download, the prompt sets `downloadStarted` permanently and disables its action. If Android's package installer is dismissed or its launch is interrupted, the app has no action to reopen the already-downloaded APK; periodic update checks do not reset the state because the target version is unchanged.
- **Root cause:** The UI treats a completed download as a terminal state, while the native bridge exposes status but no way to reopen the verified APK URI.
- **Recommended fix:** Keep the completed request ID and expose a native action that revalidates the saved DownloadManager request before reopening the installer. Restore that matching request after app restart and present an explicit install/retry action after download completion.
- **Severity:** Medium
- **Status:** Fixed — the native bridge revalidates the saved request ID, target version, successful DownloadManager status, and update title before reopening the installer. The prompt restores the matching request after app restart and presents **Open installer** after a completed download; native state is cleared only after the installed version reaches the saved target. Type-check and unit tests pass; device installation/cancel/reopen verification remains pending.

### BUG-086 — WhatsApp checkout popup can replace the Android app page

- **Files:** `frontend/src/app/checkout/page.tsx`, Capacitor's Android `BridgeWebChromeClient`
- **Description:** The WhatsApp checkout flow pre-opens `about:blank` with `window.open` before saving the enquiry, then navigates that window to WhatsApp. Android WebView's default multiple-window support is disabled; the platform documents that `window.open()` requests then navigate in the same WebView, replacing the current page. In the app this can unload checkout before its enquiry request finishes or leave the user on a blank page.
- **Root cause:** The website's popup-blocker workaround is shared with Android WebView even though its window semantics differ from a desktop browser.
- **Recommended fix:** Keep the popup flow on the website, but on Android save the enquiry first and open the resulting WhatsApp URL through Capacitor Browser.
- **Severity:** Medium
- **Status:** Fixed — Android now skips the `about:blank` popup, saves the enquiry, then opens the WhatsApp URL through Capacitor Browser; desktop website popup behavior is preserved. Repository type-check, focused ESLint, all 152 tests, and the production build passed in the Cycle 29 addendum below. Physical Android checkout verification remains pending.

### BUG-087 — Stripe invoice webhook acknowledges failed payment persistence

- **Files:** `backend/billing/service.ts`, `backend/payments/webhooks/index.ts`
- **Description:** `applyStripeInvoiceEvent` catches and discards errors from `prisma.payment.upsert` for an invoice payment intent. The function can then update the subscription and return normally; `handleStripeEvent` marks the corresponding webhook receipt `PROCESSED`. If the Payment write failed, Stripe's retry is treated as a duplicate and the missing/stale payment record is never reconciled by that event.
- **Root cause:** A persistence error on the payment reconciliation path is treated as an optional side effect even though it is part of the authoritative invoice settlement state.
- **Recommended fix:** Let the Payment upsert error reach `handleStripeEvent` so the receipt is marked `FAILED` and Stripe receives a retryable error response. Add a mocked regression that forces the Payment upsert to fail and proves the handler does not report successful processing.
- **Severity:** High
- **Status:** Fixed — `applyStripeInvoiceEvent` no longer suppresses Payment upsert errors. The error reaches `handleStripeEvent`, which marks the receipt `FAILED` and rethrows for provider retry. Regression test simulates Payment persistence failure and confirms a failed receipt; targeted webhook suite, repository type-check, and lint pass. A live Stripe retry remains unverified.

### BUG-088 — Update install recovery conflates permission settings with installer state

- **Files:** `android/app/src/main/java/com/nurava/hubstores/MainActivity.java`, `android/app/src/main/java/com/nurava/hubstores/AppUpdaterPlugin.java`
- **Description:** Before opening Android's unknown-app install permission settings, the app persists `installer_prompt_open=true` and keeps the APK URI only in an Activity field. If Android kills/recreates the app during the settings trip, the in-memory URI is lost and resume recovery sees the same flag used for an already-open installer, so it skips automatic installer launch even when permission was granted.
- **Root cause:** One persisted state flag represents both the permission-settings trip and the package-installer trip, while the APK URI/recovery decision is not reconstructed after process recreation.
- **Recommended fix:** Persist a distinct awaiting-install-permission state. On resume, if that state is set and permission is now granted, revalidate the saved DownloadManager item and launch its installer URI; if permission is still denied, leave the completed download available for the prompt's manual retry. Keep the separate installer-open state to avoid reopening after the user cancels the package installer.
- **Severity:** Medium
- **Status:** Verified at source/build level — `MainActivity` now persists `awaiting_install_permission` separately from `installer_prompt_open`. When Android recreates the Activity and returns with install permission granted, resume recovery rechecks the saved DownloadManager request and routes its verified APK URI to the installer. If permission remains denied, recovery does not repeatedly reopen Settings; the in-app retry remains available. Download completion still retains Android's installer confirmation. `:app:compileDebugJavaWithJavac` and `:app:assembleDebug` both pass. Physical-device permission grant/deny, process recreation, installer cancel, and installation checks remain pending.

### BUG-089 — Android app displays page scrollbars

- **Files:** `android/app/src/main/java/com/nurava/hubstores/MainActivity.java`, `frontend/src/components/providers/AndroidSystemBars.tsx`, `frontend/src/app/globals.css`
- **Description:** The global website scrollbar styling is active in the shared WebView, and the native WebView has no vertical-scrollbar suppression. Scrolling app pages can show a vertical bar at the right edge.
- **Root cause:** Website scrollbar styling is shared with the Android WebView, which has not enabled app-only scrollbar suppression.
- **Recommended fix:** Disable the native WebView vertical scrollbar and apply scrollbar-hiding CSS only after detecting the native Android platform. Preserve the website's existing scrollbar styling.
- **Severity:** Low
- **Status:** Verified at source/build level — `MainActivity` disables the WebView vertical scrollbar, and `AndroidSystemBars` adds `android-app` only on native Android. `globals.css` hides scrollbars only under that class; browser instances never receive it and retain existing scrollbar styling. Type-check, lint, production build, and Android staging APK build pass. Physical rendering on an Android device remains unverified.

### Cycle 29 verification

- `npm test`: PASS, 152/152. The webhook tests logged the expected local PostgreSQL-unavailable diagnostics; their mocked assertions passed.
- `npm run type-check`: PASS for frontend and backend.
- `npm run lint`: PASS, 0 errors and 55 warnings; the modified update-prompt file passes standalone ESLint with no warnings.
- `git diff --check`: PASS.
- Android `:app:compileDebugJavaWithJavac` and `:app:assembleDebug`: PASS with JDK 21 and the installed Android SDK. The generated local APK contains the synced offline fallback; source, synced asset, and APK asset SHA-256 values match (`c6830b21086028f3c58f0dc91dcc4297f8042ad5db93e638a2102767b6d651e9`). The APK was not published or installed. No physical Android device is connected, so installer cancel/reopen and real download status remain unverified.
- Read-only staging `/api/health`: PASS; application and database both reported up. Mobile-sized Chromium smoke: sign-in form rendered after hydration; `/admin/dashboard`, `/manage/settings`, and `/platform` redirected to the sign-in gate; the website homepage rendered its **Open App** footer link; no non-GET requests were observed.
- Read-only staging update contract: manifest returned HTTP 200 with `versionCode: 14`, `versionName: 1.3.10`, and APK path `/downloads/nurava-hubstores-staging.apk`; APK HEAD returned 200 and `application/vnd.android.package-archive`. The local Android Gradle version is also code 14, so the newly built local native changes are not yet advertised as an update to an installed version 14. A version bump and staging deployment are required before the in-app update can deliver this local native fix; no release artifact was published.
- Source tracing covered Android Google OAuth ticket exchange, protected portal return URLs, footer app/website links, native update download recovery, M-Pesa checkout route ownership, and shared image-upload API paths. Live OAuth, payments/provider callbacks, R2 uploads, and device behavior remain operational verification gates.
- Cycle 29 found BUG-085 and BUG-086 and fixed both in source. It does not count as a clean full audit. Two consecutive complete post-repair audits remain outstanding.

### Cycle 29 continuation — 2026-10-11

- The active branch remains `saas-staging`; no changes were made to `multi-industry-commerce`, and no commit, push, or deployment was performed.
- `npm run type-check`: PASS for frontend and backend after BUG-086.
- `npx eslint src/app/checkout/page.tsx`: PASS with no warnings. `git diff --check`: PASS.
- `npm test`: PASS, 152/152. The webhook tests printed their expected local PostgreSQL-unavailable diagnostics; assertions passed.
- Production `npm run build`: PASS. The optimized Next.js build generated all 169 pages. The configured Neon endpoint was unreachable during store-directory generation, so the existing fallback was used; webpack cache and Node URL deprecation warnings remain.
- BUG-086 preserves the website's popup behavior and changes only the native Android path. The provider/browser handoff and actual WhatsApp launch still require a physical-device check.
- Full OAuth/logout, live provider settlement, real object-storage uploads, and Android update installer/network/theme behavior still require authenticated provider credentials or a connected device. The staging update manifest remains version 14; native changes in this local tree have not been published as an update. The complete audit and two-clean-cycle gate remain open.
- Follow-up verification after BUG-087: the focused webhook suite passed 8/8, repository type-check and lint passed, the full suite passed 153/153, and `npm run build` passed with all 169 pages generated. Webhook tests still log expected localhost PostgreSQL-unavailable diagnostics; the new payment-write failure path is mocked. The build used the existing fallback when Neon was unreachable and emitted the recorded webpack/Node warnings.
- Android upload source trace: Capacitor's `BridgeWebChromeClient.onShowFileChooser` opens the native picker for standard file inputs. Shared platform/storefront handlers optimize selected images and POST to the existing APIs. This confirms the code path exists, but file selection and a real R2 upload remain unverified on-device.
- Mobile Google auth verification: extracted the existing one-time ticket authorizer into `backend/lib/mobile-google-ticket.ts` and added regression tests for hashing, first-use/replay behavior, malformed input, expiry, and shared-user resolution. The focused tests pass 2/2, frontend/backend type-check passes, the full suite passes 155/155, and the production build passes with all 169 routes. OAuth provider callback and Android deep-link handoff still require real-account/device verification.

### Cycle 30 continuation — 2026-10-11

- The user explicitly directed that work remain on `saas-staging`; no changes were made to `multi-industry-commerce`. No commit, push, or deployment was performed.
- Fixed BUG-088 by persisting install-permission-settings state separately from package-installer state. Resume recovery revalidates the saved DownloadManager item and resumes the installer only after permission has been granted; a denied permission or cancelled installer does not cause an automatic reopen loop.
- Android `:app:compileDebugJavaWithJavac`: PASS using JDK 21 and the installed Android SDK. Android `:app:assembleDebug`: PASS. The local debug APK is `android/app/build/outputs/apk/debug/app-debug.apk`; it was not installed or published.
- `npm run type-check`: PASS for frontend and backend. `npm test`: PASS, 155/155. `npm run lint`: PASS with 0 errors and 54 warnings. `git diff --check`: PASS.
- `git diff --check`: PASS. Physical-device permission return/process recreation, update installation, and cancel/retry behavior remain unverified because no device is connected in this session.
- This was a targeted source repair and build check, not a clean full audit. The two-consecutive-clean-audit gate, live database/provider flows, real OAuth, R2 upload, and device checks remain outstanding.

### Cycle 31 — Mobile scrollbars, permissions, and staging APK — 2026-10-11

- Fixed BUG-089: native Android WebView scrollbars are disabled, and shared CSS hides scrollbars only while the root carries the `android-app` class. That class is applied only when Capacitor confirms the Android native platform; the website keeps its current scrollbar styling.
- Capability/permission audit: the merged APK requests `INTERNET` and `REQUEST_INSTALL_PACKAGES` (plus AndroidX's generated internal receiver permission). File uploads use WebView file inputs and the native file chooser, which grants access to selected URIs without broad storage/media permissions. No camera capture, geolocation, Firebase Messaging, or app-posted notification implementation is present; `google-services.json` and a push delivery integration are absent. No unused camera/location/push permissions were added. Account notifications are fetched from the shared API while the app is open; Download Manager owns the APK download notification.
- `npm run android:staging:update`: PASS. Capacitor sync found `@capacitor/app` and `@capacitor/browser`; debug APK assembled as version 1.3.11 / code 15 and copied to `frontend/public/downloads/nurava-hubstores-staging.apk`; the update manifest now points to code 15. The v15 APK signer certificate matches the prior local staging APK's signer. The artifact is local and not published.
- `npm run type-check`: PASS. `npm run lint`: PASS, 0 errors and 54 warnings. `npm run build`: PASS, 169 routes generated. Static store-directory generation could not reach Neon and used the existing fallback; webpack cache and Node URL deprecation warnings remain.
- Read-only GET to the staging health endpoint returned `ok: true` and `database: up`. The deployed update manifest still returns version 1.3.10 / code 14 and points to the v14 APK; the locally prepared v15 APK is not live because no push/deployment was authorized.
- `adb devices` shows no connected device/emulator, so scrollbar rendering, Android file-picker launch, and an actual v14-to-v15 install were not exercised on-device.
- The website was not given a new behavior change: the scrollbar rule is gated to native Android. Branch remains `saas-staging`; no changes to `multi-industry-commerce`, commit, push, or deployment occurred. The two-consecutive-clean-audit gate and the live database/provider/auth/upload/device checks remain open.

## Cycle 27 verification addendum — mobile/website integration checks — 2026-10-11

- `npm test`: PASS, 152/152. Webhook tests logged expected localhost PostgreSQL-unavailable fallback errors; no database writes were performed.
- `npm run lint`: PASS, 0 errors and 54 warnings. The command also ran the backend TypeScript build successfully.
- `npm run type-check`: PASS for frontend TypeScript and backend TypeScript.
- Targeted Playwright auth/signup/protected-route/mobile-navigation test: PASS. This also verifies BUG-080's unchecked consent feedback. The full Playwright run was interrupted after the app's Neon-backed page rendering remained slow; the database endpoint was unreachable. The provider sandbox test was skipped because `E2E_PAYMENT_PROVIDER` is unset.
- Android Java compile: PASS — `:app:compileDebugJavaWithJavac` completed successfully using temporary Temurin JDK 21. The earlier JDK 26 `jlink` transform failure was resolved by using JDK 21. Full `:app:assembleDebug` was attempted but blocked during Gradle configuration because the sandbox denied network access to Google Maven and Maven Central (`Permission denied: getsockopt`); no APK was produced by that attempt.
- Full production build: PASS. Optimized Next.js production build completed and generated 169 pages; the remote Neon database was unreachable during store-directory generation, so the existing fallback was used. Existing webpack cache and Node URL deprecation warnings remain.
- Live staging health check: BLOCKED by sandbox network (`fetch` to the staging Vercel host failed with EACCES). No public deployment status is claimed.
- Live Google OAuth, authenticated logout, provider payments/callbacks, storage uploads, device offline recovery, update installation, and physical theme/system-bar behavior remain unverified.
- BUG-081 and BUG-082 are source-fixed but not device-verified. These changes have not been built into or installed from a new APK. No database migration, seed, payment transaction, push, or deployment was run.
- This cycle found and fixed two findings and is not a clean audit. The two consecutive clean full-audit gate remains outstanding; the project audit is still active.
- Follow-up environment check: JDK 21 was downloaded to a temporary directory and used for the successful Java compile; no system-wide Java settings were changed. ADB starts successfully but reports no connected device. The read-only staging `/api/health` request was inaccessible through both direct sandbox fetch (EACCES) and the browser tool, so live staging health remains unverified.

### Cycle 32 — Post-push Android/web audit continuation — 2026-10-11

- Current Git state was rechecked: `saas-staging` and `origin/saas-staging` both point to `ed87eee` (`feat(android): enhance offline page with theme color support and update handling`); the worktree was clean before this report update. The pushed tree contains APK version 1.3.11 / versionCode 15 and the corresponding update manifest.
- Re-traced the shared Capacitor origin/config, native startup/offline fallback, theme/system-bar bridge, Google ticket/deep-link bridge, checkout WhatsApp path, app-update download/install recovery, app-vs-website footer links, and standard file inputs. No new confirmed source defect was established in this targeted continuation.
- Targeted Chromium flow `auth portals, protected workspace redirects, and platform mobile navigation work`: the test reported `ok 1` and passed in 32.8 seconds. Signup consent feedback was exercised without submitting a registration. The local application logged Neon connection failures and used configured defaults; this is not evidence of successful login, database-backed behavior, tenant CRUD, or payment processing.
- A fresh request to the staging update manifest was attempted after the push but outbound socket access to Vercel was denied. Deployment completion and the live manifest version therefore remain unverified; the committed local manifest is not proof of deployed state.
- This continuation is not a full audit cycle and does not count toward the two-consecutive-clean-full-audit requirement. Live Google OAuth/logout, Neon migration/data behavior, authenticated tenant CRUD, M-Pesa/Stripe callbacks, real R2 uploads, and Android-device offline/update/theme/navigation/file-picker behavior remain unverified. No device is connected.

### BUG-090 — Mobile Google OAuth ticket can be redeemed when a custom-scheme link is intercepted

- **Files:** `frontend/src/lib/mobile-google-auth.ts`, `frontend/src/app/auth/mobile-google-start/page.tsx`, `frontend/src/app/api/auth/mobile-google/complete/route.ts`, `frontend/src/components/providers/AndroidBackButtonHandler.tsx`, `frontend/src/lib/auth.ts`, `backend/lib/mobile-google-ticket.ts`
- **Description:** The Android app checked a random `state` before exchanging the one-time Google OAuth ticket, but the callback deep link carried both the ticket and that same state. An Android app that intercepted the custom-scheme callback could therefore submit the bearer ticket to the `mobile-ticket` credentials provider without possessing any secret held only by the HubStores WebView.
- **Root cause:** Callback correlation state was treated as proof of possession even though it was included in the interceptable callback URL; the server ticket grant was not bound to an app-held secret.
- **Severity:** High
- **Status:** Fixed at source/test/build level — the WebView now creates a random PKCE verifier and stores it with the pending state. Only its SHA-256 challenge is sent through the OAuth start/callback and stored with the short-lived ticket grant. Ticket redemption requires the verifier, and an incorrect verifier does not consume the ticket. No schema migration is needed. Focused ticket tests pass 3/3, the full unit suite passes 156/156, focused ESLint and repository type-check pass, and production build passes with 169 routes. Real Google OAuth and device callback interception/return remain unverified.

### Cycle 33 — Mobile OAuth ticket binding repair — 2026-10-11

- Reproduced the missing possession check by tracing the custom-scheme callback, which contained the same state value stored in localStorage, and the server credential provider, which previously accepted only the ticket. Added PKCE-style verifier binding end to end without changing the shared Google account/session model or database schema.
- `node --test --require ./tests/register.cjs tests/auth/mobile-google-ticket.test.ts`: PASS, 3/3, including mismatched-verifier rejection without ticket consumption.
- `npm test`: PASS, 156/156. The webhook tests logged expected local PostgreSQL-unavailable diagnostics; their mocked assertions passed.
- `npm run type-check`: PASS. Focused ESLint on the modified frontend auth files: PASS. `npm run build`: PASS, all 169 routes generated. The existing Neon-unreachable fallback was used during store-directory generation; webpack cache and Node URL deprecation warnings remain.
- This cycle found and fixed BUG-090, so it does not count as a clean full audit. The repair is local and has not been committed, pushed, or deployed. Live Google OAuth, Android callback interception behavior, authenticated logout, database/provider flows, real uploads, and remaining physical-device behavior are still unverified.

### BUG-091 — Footer app/website quick link differs between server render and Android hydration

- **Files:** `frontend/src/components/layout/Footer.tsx`
- **Description:** The footer selected **Open Website** by calling Capacitor's native-platform APIs during render. The server render sees the web platform and emits **Open App**, while an Android WebView sees the native platform during hydration and emits **Open Website**. This creates a hydration mismatch and can expose the wrong action briefly on the app's footer.
- **Root cause:** Native platform detection ran during a render that is also server-rendered.
- **Severity:** Low
- **Status:** Fixed at source/test level — the component now renders a stable web default on both server and first client render, then detects Android in an effect and switches to **Open Website**. A regression assertion verifies that native detection is deferred. Focused frontend tests pass 19/19, focused ESLint and repository type-check pass. Browser/native runtime rendering remains unverified.

### Cycle 34 — Footer SSR/native link alignment — 2026-10-11

- Fixed BUG-091 by moving Capacitor detection out of render; Android-only **Open Website** and website **Open App** behavior remain intact after hydration.
- Focused frontend/service plus mobile Google ticket tests pass 19/19. Focused ESLint and `npm run type-check` pass. Full `npm test` passes 157/157. `npm run build` passes and generates 169 routes; store-directory generation used its existing fallback because Neon was unreachable. Existing webpack cache and Node URL deprecation warnings remain.
- This cycle found and fixed BUG-091, so it is not a clean audit cycle. The source changes and documentation remain local and unpushed; Vercel access and physical Android device verification remain unavailable.

### Cycle 35 — Staging APK rebuild and native capability evidence — 2026-10-11

- Rechecked BUG-089: Android WebView vertical scrollbars are disabled in `MainActivity`; shared CSS hides scrollbars only when the native Android provider applies `html.android-app`. Website browser scrollbar styling remains unchanged.
- Inspected the merged manifest from the rebuilt APK. It requests `INTERNET` and `REQUEST_INSTALL_PACKAGES` plus AndroidX's internal receiver permission. Standard file upload uses the WebView file chooser and grants selected URI access; no camera capture, geolocation, push-messaging registration, or app-posted notification flow exists, so no unrelated runtime permissions were added.
- `npm run android:staging:update`: PASS using Temurin JDK 21 and the installed Android SDK. Generated local APK version 1.3.12 / versionCode 16 and updated the local update manifest URL to `/downloads/nurava-hubstores-staging.apk?v=16`.
- `aapt dump badging`: package `com.nurava.hubstores`, versionCode 16, versionName 1.3.12, min SDK 24, target SDK 36. `apksigner verify`: PASS; the Android debug signer matches version 15's signer, so signing identity is consistent for a local in-place test update. Built APK and downloadable-copy SHA-256 are identical (`6320b5125d4ad1b42353ed0432430461a6da4fb9c0d9d38d5c76d730d3ec54f1`); each is 5,040,167 bytes.
- The APK and manifest are local changes and have not been pushed or deployed, so the live app update endpoint still cannot deliver version 16. No Android device is connected; installing/updating on the Samsung device, scrollbar appearance, file picker, offline recovery, and theme behavior remain unverified. Live Google OAuth/logout, database-backed account flows, real payments, and remote uploads also remain open gates.
- This targeted verification does not count as a clean full audit. The audit remains active, and no changes were made to `multi-industry-commerce`.

### BUG-092 — Shopper M-Pesa payment references are client-controlled and can resolve to another order

- **Files:** `frontend/src/app/api/payments/mpesa/initiate/route.ts`, `frontend/src/app/api/payments/mpesa/verify/route.ts`, `frontend/src/app/checkout/page.tsx`, `backend/payments/mpesa/index.ts`
- **Description:** The shopper initiation route accepts the reference from the browser. The payment service uses tenant plus that reference to find an existing M-Pesa payment and returns it without confirming that its `orderId` matches the order in the current request. The verification route likewise looks up a payment by tenant plus caller-provided reference, without binding the verification request to an order or customer. A forged/colliding reference can therefore report or reuse a different shopper's payment; the checkout also constructs references from only the final eight order-ID characters.
- **Root cause:** Payment identity and status lookup trust a browser-provided reference instead of binding it to the server-verified order and its owner.
- **Recommended fix:** Derive references server-side from the full order ID; reject any existing payment whose order/amount differs; and require verification to include the order identity plus owner proof, then look up and verify only that order's payment record. Reuse an already-pending legacy payment so a rollout does not duplicate an in-flight request.
- **Severity:** High
- **Status:** Verified at source/test/build level — server derives the new reference from the full order ID, prevents reference reuse across order/amount mismatches, checks the registered account or guest phone on verification, and verifies the exact payment row for the requested order. Existing pending payments are reused by order to preserve in-flight requests from the previous short-reference format. Focused regressions, all 159 unit tests, type-check, focused ESLint, and the 169-route production build pass. Live M-Pesa callbacks/settlement remain unverified.

### BUG-093 — Shopper payment metadata can overwrite the trusted M-Pesa reference

- **Files:** `frontend/src/app/api/payments/mpesa/initiate/route.ts`, `backend/payments/mpesa/index.ts`
- **Description:** The shopper initiation validator accepted arbitrary metadata, and the shared service merged that object after its server-owned payment reference and merchant request ID. A direct API caller could replace those protected metadata fields, breaking reliable lookup/callback correlation and undermining order-bound payment identity.
- **Root cause:** Untrusted request metadata is allowed into a shopper payment record and takes precedence over the service's trusted correlation identifiers.
- **Recommended fix:** Remove shopper-supplied metadata from the initiation contract and merge trusted reference/request IDs after any metadata from trusted internal callers.
- **Severity:** High
- **Status:** Verified at source/test/build level — the shopper initiation API no longer accepts metadata, and the shared service merges trusted reference/merchant request IDs after allowed internal metadata. The focused M-Pesa suite passes 4/4 and the production build passes with 169 routes. Live provider callback correlation remains unverified.

### Cycle 37 — Trusted M-Pesa payment metadata — 2026-10-11

- Recorded BUG-093 before repair after tracing the allowed shopper metadata through the shared payment writer.
- Removed caller-provided metadata from the shopper initiation contract. The shared payment service now places its trusted reference and merchant request ID after any internal metadata, preventing those fields from being overwritten.
- Focused M-Pesa suite: PASS, 4/4. Focused ESLint: PASS. Production build: PASS, all 169 routes generated; store-directory generation used the existing fallback because Neon was unreachable. `git diff --check`: PASS.
- Daraja callback behavior against a live provider and database remains unverified. This cycle found and fixed a new issue, so it does not count as a clean full audit.

### BUG-094 — Storefront account menu stays stuck in signing-out state after logout

- **File:** `frontend/src/components/layout/Header.tsx`
- **Description:** Storefront `StoreAccountMenu` calls `signOut({ redirect: false })` and marks itself as signing out, but clears that state only when the call throws. The menu remains mounted after a successful sign-out; if the user signs in again without a full page reload, its Sign out action remains disabled and reads “Signing out…” indefinitely. The same shared component is used by the Android WebView and website storefronts.
- **Root cause:** The successful sign-out path closes the menu but never resets the component's `signingOut` state.
- **Recommended fix:** Always clear the local in-progress flag after the sign-out request settles, including the success path.
- **Severity:** Medium
- **Status:** Verified at source/test/type-check level — `StoreAccountMenu` now clears `signingOut` in `finally`, so both successful and failed sign-out attempts release the busy state. The storefront regression assertion passes. The shared menu serves web storefronts and the Android WebView; authenticated live logout remains unverified.

### Cycle 38 — Storefront sign-out recovery — 2026-10-11

- Fixed BUG-094 by clearing the storefront menu's signing-out flag in `finally`, including after successful sign-out. Failed sign-out keeps the menu available to retry.
- Regression check: `node --test --require ./tests/register.cjs tests/frontend/services.test.ts` PASS, 17/17. Full `npm test` PASS, 160/160. `npm run type-check` PASS. Focused ESLint on `Header.tsx` reports zero errors and one existing `<img>` warning. `git diff --check` PASS with line-ending notices only.
- `npm run build` PASS; all 169 routes generated. Store-directory generation used the existing fallback because the configured Neon endpoint was unreachable. Existing webpack cache, Node URL deprecation, and repository lint warnings remain.
- This is source/test/type-check/build evidence; authenticated web logout and native Android logout have not been exercised against the live staging session. Deployment was not checked. This cycle found and fixed an issue and does not count toward the two consecutive clean full audits.

### Cycle 39 — Offline recovery parity check — 2026-10-11

- Compared the website `OfflineNotice`, the Capacitor `MainActivity` main-frame error fallback, and the bundled `capacitor-shell/offline.html`. The website and native fallback use the same connection-unavailable copy and Wi-Fi-off icon; the bundled page retries the failed URL and returns to it when the request succeeds. No new source defect was confirmed in this trace.
- Added a Playwright regression case that aborts the first request, then allows the retry and resulting navigation. Both tests in `tests/e2e/android-offline-theme.spec.ts` printed `ok`, including theme-parameter validation and offline recovery. The Playwright command did not exit after the tests because the spawned dev-server process remained alive; it was interrupted during cleanup, so no clean suite exit is claimed. Dev-server logs showed the configured Neon endpoint was unavailable and defaults were used.
- This validates the bundled page in desktop Chromium only; it does not verify Android WebView connectivity-change events, active-page recovery, or native theme bars on a device. No new production build was needed for this test-only change. The audit remains open.

### BUG-095 — Shopper card metadata can overwrite trusted Stripe payment correlation fields

- **Files:** `frontend/src/app/api/payments/card/create-intent/route.ts`, `backend/payments/cards/index.ts`
- **Description:** The public card-intent schema accepts arbitrary `metadata`; the route passes it to the shared payment service, which currently merges it after the trusted payment `reference` and `orderId` in both Stripe intent metadata and the local payment metadata. A caller can replace those correlation values, so checkout verification can fail to find its own payment and Stripe-side metadata can point at a different order than the local payment row.
- **Root cause:** Shopper-controlled metadata is admitted into the card initiation flow and spread after service-owned correlation identifiers.
- **Recommended fix:** Remove shopper-supplied metadata from the public card-intent contract and merge trusted reference/order/client-secret fields after any metadata supplied only by internal callers. Cover both the metadata merge and the public request contract.
- **Severity:** High
- **Status:** Verified at source/test/type-check/build level — the public shopper route no longer accepts metadata, and trusted reference/order/client-secret values override collisions from internal callers. Public-contract and merge-collision regressions pass; the full 162-test suite, repository type-check, and production build of all 169 routes pass. Live Stripe checkout/webhook reconciliation remains unverified.

### Cycle 40 — Trusted Stripe shopper metadata — 2026-10-11

- Fixed BUG-095 by removing shopper-supplied metadata from the card-intent API and ensuring the shared service writes trusted reference, order ID, and client secret after internal metadata.
- Regression checks: focused card/frontend tests pass 22/22. Full `npm test` passes 162/162. `npm run type-check` passes. `npm run build` passes and generates all 169 routes; store-directory generation used the existing fallback because Neon was unreachable. Existing webpack cache, Node URL deprecation, and repository lint warnings remain. `git diff --check` passes with line-ending notices only.
- Live Stripe intent creation, payment confirmation/webhook reconciliation, authenticated checkout, and Android WebView payment behavior remain unverified. This cycle found and fixed an issue and does not count toward the two consecutive clean full audits.

### Cycle 41 — App/web links and native file selection audit — 2026-10-11

- Traced the `Open Website` and `Open App` footer actions, including the Android intent's same-origin URL validation and browser APK fallback. The in-app action preserves the current page URL when opening the browser; no source mismatch was confirmed.
- Inspected Capacitor's installed `BridgeWebChromeClient.onShowFileChooser`: ordinary and multiple-selection inputs use Android's system file picker and return selected content URIs to the WebView. Camera permission is requested only when a web input explicitly enables capture; current shared image/document inputs do not request capture. The app does not need blanket storage permission for these pickers.
- Traced product image and merchant evidence uploads from file input through multipart API validation, tenant permission checks, MIME/signature/size checks, and existing storage APIs. No source-level web/native divergence was confirmed. Actual Android file selection, authenticated session cookies, and R2 storage writes still require a connected device and reachable services.
- Source review only; no code change or new test in this cycle. The overall audit remains open pending live auth/payment/database/storage and physical Android verification.

### BUG-096 — Native update failures silently fall back to manual browser APK download

- **File:** `frontend/src/components/providers/AndroidAppUpdatePrompt.tsx`
- **Description:** When the native `AppUpdater` plugin is available, any rejection from its `downloadUpdate` method is caught and replaced with `Browser.open`. This includes native validation, DownloadManager, or installer-preparation failures. The prompt then tells the user to manually open the APK, bypassing the native auto-installer and hiding the original failure.
- **Root cause:** The fallback is triggered by any rejected native download, rather than only when the plugin is unavailable on an older installed app.
- **Fix:** Kept the browser download path only for installs without the native plugin. Rejections from the native updater now reach the prompt's existing error handling, preserving the real failure and allowing retry instead of silently starting a manual download.
- **Severity:** Medium
- **Status:** Verified at source/test/build level. Focused service tests pass 19/19, the full unit suite passes 163/163, type-check and focused ESLint pass, and the production build generates all 169 routes. Actual native download/install still needs a physical Android device.

### Cycle 42 — Native APK updater failure handling — 2026-10-11

- Reproduced BUG-096 in `AndroidAppUpdatePrompt`: a catch around `AppUpdater.downloadUpdate` treated every native updater failure as a reason to open the APK in the browser. This masked native errors and bypassed automatic installation.
- Removed that catch-all browser fallback. The browser fallback now applies only when the native updater plugin is unavailable; native failures appear through the prompt's error state and remain retryable.
- Added a regression assertion proving native updater rejection does not invoke browser fallback. Focused service tests pass 19/19; full `npm test` passes 163/163; repository type-check and focused ESLint pass; `npm run build` passes and generates all 169 routes.
- The build used the configured Neon-unreachable store-directory fallback and emitted existing webpack cache, lint, and Node URL deprecation warnings. No build errors occurred.
- No physical Android device is connected, so native DownloadManager and package-installer behavior remain unverified. This cycle found and fixed an issue and does not count toward the two consecutive clean full audits.

### BUG-097 — Native launch overlay ignores the last active site theme

- **File:** `android/app/src/main/java/com/nurava/hubstores/MainActivity.java`
- **Description:** `SystemBarsPlugin` persists the last rendered page palette in `active_theme`, and the offline page reads that palette, but `showNativeLaunchOverlay()` always applies the static dark `native_launch_background`. Returning to the app after using a light or differently colored storefront therefore flashes a mismatched launch panel before the shared website UI renders.
- **Root cause:** The native overlay is created without consulting the already persisted theme preferences.
- **Fix:** Build the overlay background from the persisted background, surface, and primary colors, validating each value and using the existing brand palette as the first-launch fallback. The centered launch icon and its position remain unchanged.
- **Severity:** Medium
- **Status:** Verified at source/build/artifact level — Android `assembleDebug` passes with JDK 21 and SDK 36; version 1.3.13 / versionCode 17 passes package metadata and APK signature verification. The staged-copy APK hash matches the build output. The earliest Android system splash remains a fixed brand fallback; the saved web palette applies to the native overlay after the activity starts. Physical-device rendering remains unverified.

### Cycle 43 — Native launch theme synchronization — 2026-10-11

- Inspected the launch sequence and confirmed the system splash has a fixed brand fallback while the app's native overlay remains visible until the remote web page finishes rendering. The last active site palette is already persisted by `SystemBarsPlugin`, but was not used by that overlay.
- Fixed BUG-097 by using validated persisted theme colors for the overlay and keeping the existing navy/orange palette as the safe default when no saved theme exists. The icon layout is unchanged.
- `:app:assembleDebug` passes using the installed Gradle 8.14.3 distribution, Temurin JDK 21, and Android SDK 36. The rebuilt APK is version 1.3.13 / versionCode 17; `aapt dump badging` confirms package/version metadata and `apksigner verify` passes with the same debug certificate as version 1.3.12. The build APK and `frontend/public/downloads/nurava-hubstores-staging.apk` SHA-256 values match (`4d55fb758dae0fb93d538bb511642421a8af5d5c2188f5fd57d9bae074f26507`). The update manifest points to versionCode 17.
- The standard staging wrapper could not run in this shell because it tried to fetch Gradle again; direct use of the installed Gradle distribution completed the build. The Android system splash itself remains a static brand-color resource until native activity code can read the saved web theme. ADB reports no connected device and no emulator AVD is configured, so the visual behavior cannot be verified on Android in this environment.
- This cycle found and fixed a source issue and does not count toward the two consecutive clean full audits.

### BUG-098 — Android WebView does not preserve external `target="_blank"` link behavior

- **Files:** `android/app/src/main/java/com/nurava/hubstores/MainActivity.java`, `frontend/src/components/providers/AndroidBackButtonHandler.tsx`, and shared link components.
- **Description:** The shared website renders external links with `target="_blank"` for WhatsApp, social profiles, maps, and some storefront/product links. Capacitor's Android WebView does not enable multiple-window support or implement `onCreateWindow`; Android WebView defaults to treating `_blank` requests as a top-level navigation in the current WebView. In the Android app these links can replace the current storefront/page instead of opening a separate browser surface, unlike the website's new-tab behavior.
- **Root cause:** Shared `target="_blank"` links have no app-only external-browser handoff; the native WebView does not provide browser-tab semantics.
- **Fix:** On native Android only, intercept unmodified clicks on cross-origin HTTP(S) anchors with `target="_blank"` and open them with Capacitor Browser. Same-origin navigation, modified clicks, downloads, and website behavior remain unchanged.
- **Severity:** Medium
- **Status:** Verified at source/test/type-check/build level — regression coverage, targeted ESLint, and the production build pass. Actual external-app handoff on a physical Android device remains unverified.

### Cycle 44 — External link handoff audit — 2026-10-11

- Scanned shared React components for `target="_blank"` and browser/external handoffs. Found external WhatsApp, social-profile, map, and store-discovery links that depend on new-window behavior.
- Confirmed the installed Capacitor Android client does not set `WebSettings.setSupportMultipleWindows` and `BridgeWebChromeClient` does not override `onCreateWindow`. Android documents that with multiple-window support disabled, `_blank` requests navigate the current WebView instead of opening a new one.
- Fixed the issue with an Android-only click handler and a shared URL classifier. Same-origin, non-HTTP(S), modified, and download links are not intercepted; website behavior is unchanged.
- `node --test --require ./tests/register.cjs tests/frontend/services.test.ts`: PASS, 21/21. Targeted ESLint for `AndroidBackButtonHandler.tsx` and `android-app-download.ts`: PASS. `npm run build`: PASS; all 169 routes generated and type checking completed. The build emitted existing lint, webpack-cache, and Node URL deprecation warnings; store-directory generation used the fallback because Neon was unreachable. `git diff --check`: PASS with line-ending notices only.
- Physical Android external-browser handoff and live staging navigation remain unverified. This cycle found and fixed a source issue, so it does not count toward a clean full audit.

### Cycle 36 — Shopper payment ownership and reference audit — 2026-10-11

- Source trace confirmed the shopper M-Pesa API accepted a browser-supplied reference; the shared payment service could return a payment without checking that it belonged to the requested order, and verification did not require order ownership. Recorded BUG-092 before repair.
- Fixed initiation to create references from the complete server-validated order ID and reject any existing payment whose order or amount differs. Fixed verification to require order ID and phone, apply the same registered-user/guest ownership check used at initiation, locate the M-Pesa payment under that exact order, and pass its database ID to provider verification.
- Preserved older pending payments during rollout: initiation reuses an active M-Pesa payment for the same order, and verification uses the reference stored on that exact row. This avoids starting a duplicate STK prompt for orders created with the previous short reference.
- `npm test`: PASS, 159/159. New tests cover full-order reference uniqueness, order/amount matching, and registered/guest ownership. `npm run build`: PASS, all 169 routes; Next static generation used the existing fallback because the configured Neon endpoint was unreachable. Focused ESLint and `git diff --check` pass.
- Live Daraja initiation/callback/verification, guest-order recovery on a real browser, and database-backed multi-order settlement remain unverified. BUG-092 is verified at source/test/build level, not with live provider transactions. This cycle found and fixed an issue, so it does not count toward the two consecutive clean full audits.
