# Nurava Tech Future Updates

**Purpose:** implementation guide for advanced features and operational hardening  
**Repository baseline:** 22 August 2026  
**Related reference:** [User Manual.md](User%20Manual.md)

This roadmap contains recommended future work for efficiency, productivity,
merchant value, platform revenue, and production reliability. These items are
not claims that the current application already provides them. Each item
includes the reason to build it, the implementation direction, and a practical
definition of done.

## 1. Delivery principles

Future work should preserve these existing decisions:

- Keep platform discovery, merchant storefronts, merchant workspace, and
  platform control plane separate.
- Resolve tenant context from the server host and scope every tenant-owned query.
- Keep merchant-direct shopper commerce explicit until Nurava deliberately
  becomes a merchant of record.
- Treat provider state, database state, and deployment state as authoritative;
  never use placeholder metrics or browser state as proof.
- Extend the current Next.js App Router, Prisma, billing, notification, and
  tenant-access architecture instead of creating parallel systems.
- Add migrations, source checks, tenant-isolation tests, and browser coverage
  with each data-bearing feature.
- Gate features through database entitlements and usage counters rather than
  only hiding buttons in the UI.
- Make irreversible operations audited, reversible where possible, and
  observable in production.

## 2. Priority roadmap

| Priority | Theme | Why it comes first |
|---|---|---|
| P0 | Trust and workflow completion | Fixes flows that can currently mislead operators or strand users |
| P1 | Merchant productivity | Reduces repetitive catalog, order, support, and inventory work |
| P2 | Revenue and retention | Adds monetizable capabilities and improves merchant outcomes |
| P3 | Intelligence and scale | Improves automation, forecasting, discovery, and platform efficiency |

## 3. P0: close the operational gaps

### 3.1 Complete invitation acceptance

**Current baseline:** the merchant API creates a hashed, seven-day invitation and
returns a manual link, but the route tree has no browser page for
/auth/accept-invitation.

**Build:**

- Add an App Router acceptance page.
- Validate the token server-side and display tenant/store, email, and role.
- Support an existing account signing in before acceptance.
- Support account creation when the invited email has no account.
- Atomically mark the invitation accepted and create/reactivate the membership.
- Reject expired, already-accepted, mismatched, or revoked tokens.
- Send invitation and acceptance emails through Resend.
- Add resend/revoke actions with audit records.

**Definition of done:** a new user can accept an invite end-to-end, an existing
user can accept without a duplicate membership, the token cannot be reused, and
cross-tenant invitation tests pass.

### 3.2 Add a first-class multi-store switcher

**Current baseline:** onboarding lists memberships, but workspace tenant selection
is host-based. A query parameter must never be allowed to widen access.

**Build:**

- Add a server-issued store switch flow that resolves only memberships owned by
  the signed-in user.
- Redirect to the selected verified platform subdomain or custom canonical host.
- Show store name, publication status, tenant status, and current role.
- Preserve the active store only as a convenience; re-resolve it from the host
  on every request.
- Add a safe fallback when a store is suspended or deleted.

**Definition of done:** a user with two stores can switch from the workspace,
every API call uses the selected host tenant, and authorization tests prove that
a forged store ID cannot switch context.

### 3.3 Enforce role permissions consistently

**Current baseline:** role guards exist, but the workspace contains many pages
and shared administrative surfaces.

**Build:**

- Create a single permission matrix for owner, admin, manager, support, and
  editor capabilities.
- Apply it to every page action and every API mutation.
- Return clear 403 responses and hide unavailable actions without relying on
  hidden buttons.
- Add role-management audit records and least-privilege tests.
- Consider per-user custom permissions only after the fixed matrix is reliable.

**Definition of done:** each mutation has a server-side permission test and a
role-by-action matrix is part of the documentation.

### 3.4 Make publication and domain status observable

**Current baseline:** publication, verification, DNS, SSL, and provider checks
are separate and can be operationally confusing.

**Build:**

- Add a merchant launch checklist with explicit pass/fail/pending states.
- Check verified domain, DNS resolution, SSL certificate, tenant status,
  merchant approval, legal acceptance, required contact details, and published
  settings.
- Add platform alerts for a published store whose canonical domain fails.
- Show last checked time and the source of each status.
- Never turn a failed external check into an inferred success.

**Definition of done:** a merchant can see exactly why a store cannot publish or
cannot be reached, and platform staff can monitor failures.

### 3.5 Make SaaS billing launch-ready

**Current baseline:** M-Pesa invoice-driven billing is implemented in source;
Stripe remains provider-ready. Live provider/database/webhook evidence is still
required before launch claims.

**Build:**

- Complete sandbox and production callback registration.
- Add a provider event dashboard showing receipt, signature result, processing
  result, retry count, and local record.
- Add idempotent retry/dead-letter handling for failed webhook processing.
- Add invoice PDF/receipt generation and merchant email delivery.
- Add payment reconciliation and manual operator resolution.
- Add grace-period notifications before suspension.
- Add billing test fixtures for trial expiry, renewal, failure, retry, plan
  change, cancellation, and reactivation.

**Definition of done:** a real sandbox payment creates the expected invoice,
payment, subscription, tenant, and notification state exactly once, with a
repeat callback remaining harmless.

### 3.6 Production observability and incident response

**Build:**

- Structured logs with request ID, tenant ID, route, actor, provider event ID,
  and latency, while excluding secrets and sensitive verification values.
- Error tracking with source maps and alert thresholds.
- Metrics for request failure, database latency, webhook lag, email/SMS failure,
  queue depth, image upload failure, and subscription churn.
- Uptime checks for platform root, a merchant host, health endpoint, database,
  and provider callbacks.
- Incident runbooks for database outage, tenant isolation suspicion, failed
  billing callback, R2 outage, and accidental publication.
- A status page or operator-facing incident banner.

**Definition of done:** an operator can identify a failing tenant/provider path,
trace one request safely, and follow a documented recovery procedure.

## 4. P1: merchant productivity features

### 4.1 Merchant enquiry and lightweight CRM

This is the highest-value feature while the platform remains merchant-direct.

**Build:**

- Persist a shopper enquiry/lead when the cart handoff is created.
- Record selected products, quantity, source store, contact method, consent,
  attribution, and last activity.
- Add lead statuses: NEW, CONTACTED, QUOTED, WON, LOST, SPAM.
- Let merchants assign, tag, search, and add notes.
- Generate a quote with expiry, merchant-confirmed price, delivery, and terms.
- Keep a clear distinction between an enquiry, a quote, and a completed external
  sale.
- Add WhatsApp/email conversation links and follow-up reminders.

**Definition of done:** a merchant can turn a storefront enquiry into an
assigned quote, measure conversion, and export the lead history without
pretending Nurava processed the payment.

### 4.2 Bulk catalog import and export

**Build:**

- CSV/XLSX import with a downloadable template.
- Preview, validation, duplicate-SKU detection, category mapping, and dry run.
- Background import jobs with progress and per-row error reports.
- Bulk price, stock, featured, and publication updates.
- Image URL import with safe allowlists and R2 transfer.
- Versioned rollback for a bulk change.
- Enforce product and storage entitlements during import.

**Definition of done:** a merchant can import 500 valid products, see invalid rows
without losing valid rows, and roll back one import batch.

### 4.3 Purchase orders and suppliers

**Build:**

- Supplier records, contacts, costs, lead times, and product mappings.
- Purchase orders with draft, sent, partially received, received, and cancelled
  states.
- Receive stock into a movement ledger.
- Record landed cost, supplier invoice, and expected delivery.
- Connect reorder suggestions to a purchase-order workflow.

**Definition of done:** a low-stock suggestion can become a purchase order and
receipt, increasing the correct product/variant stock with an audit trail.

### 4.4 Real inventory ledger and multi-location stock

**Current baseline:** stock updates, alerts, suggestions, and movement history
exist, but advanced warehouse operations are not complete.

**Build:**

- Immutable stock movements for receive, sale, adjustment, return, damage,
  transfer, and reservation.
- Per-location warehouses, bins, and stock balances.
- Safety stock, reorder point, lead time, and supplier MOQ.
- Reservation/available-to-sell calculation for future transactional checkout.
- Cycle counts and approval for large adjustments.
- Barcode/QR scanning support.

**Definition of done:** the displayed available quantity is reproducible from
the movement ledger, concurrent updates do not create negative stock, and every
adjustment identifies its actor and reason.

### 4.5 Order and fulfilment automation

Even with merchant-direct selling, merchants need internal workflow tools.

**Build:**

- Internal order/quote conversion after a merchant confirms an enquiry.
- Picking and packing slips.
- Delivery zones, fees, ETAs, and dispatch batches.
- Courier integrations or a manual carrier adapter interface.
- Proof-of-delivery capture.
- Return merchandise authorization and refund-record workflow.
- Customer-facing status timeline with merchant-owned terms.

**Definition of done:** a merchant can move from confirmed sale to dispatch,
delivery proof, return, or cancellation with a complete timeline.

### 4.6 Saved views, bulk actions, and workflow shortcuts

**Build:**

- Saved filters for products, orders, tickets, reviews, and leads.
- Bulk status, tag, assign, archive, and export actions.
- Keyboard shortcuts and command palette for merchant users.
- Dashboard quick actions driven by actual pending work.
- Scheduled reports and digest emails.

**Definition of done:** common daily tasks require fewer navigation steps and every
bulk mutation remains validated and audited server-side.

### 4.7 Support inbox and service-level automation

**Build:**

- Unified ticket, email, WhatsApp, and enquiry inbox with channel labels.
- Assignment, collision protection, internal notes, canned replies, and macros.
- SLA timers by priority, business hours, and first-response/resolution target.
- Escalation rules and overdue queues.
- Customer timeline combining enquiries, orders, tickets, and notifications.
- Redaction tools for sensitive customer data.

**Definition of done:** a support manager can see overdue work, assign it, reply
from the correct channel, and measure response/resolution time.

### 4.8 Notification templates and preference center

**Current baseline:** email, SMS, and WhatsApp helpers exist, but templates and
delivery observability should be centralized.

**Build:**

- Database-backed versioned templates per channel and event.
- Preview/test-send with permission checks.
- Per-tenant branding and locale.
- Shopper and merchant preference center.
- Delivery, bounce, failure, and opt-out records.
- Retry policy that prevents duplicate customer messages.
- WhatsApp template approval state where required by the provider.

**Definition of done:** an operator can identify exactly which template was sent,
through which provider, with which delivery result, without exposing secrets.

## 5. P2: revenue, retention, and merchant growth

### 5.1 Enforce plan entitlements and usage

**Current baseline:** plan entitlements and usage counters exist in the schema and
billing services, while many limits need systematic enforcement.

**Build:**

- Central entitlement service for products, staff, storage, custom domains,
  analytics level, notifications, and API usage.
- Usage dashboards for merchants and platform operators.
- Soft warnings at 80/90/100 percent.
- Upgrade paths that preserve data and explain the affected capability.
- Add-on entitlement grants with effective/expiry dates.
- Tests proving every restricted mutation uses the entitlement service.

**Definition of done:** a Starter tenant cannot exceed its configured limits through
a direct API call, and an upgrade immediately unlocks the correct capability.

### 5.2 Merchant growth and marketing toolkit

**Build:**

- Campaign manager for email, SMS, and WhatsApp where consent permits.
- Customer segments based on purchase/enquiry behavior.
- Promo codes, scheduled promotions, bundles, and limited-time deals.
- Abandoned enquiry/cart reminders with opt-out controls.
- Referral links and merchant-owned affiliate tracking.
- UTM attribution and campaign ROI.

**Definition of done:** a merchant can create a campaign for a compliant segment,
attribute enquiries/sales, and stop messaging a user who opts out.

### 5.3 Customer loyalty and retention

**Build:**

- Merchant-scoped loyalty points and balances.
- Tier rules, rewards, expiry, and manual adjustments.
- Store credit and gift cards with an auditable ledger.
- Repeat shopper segments and replenishment reminders.
- Review request automation after merchant-confirmed fulfillment.

**Definition of done:** balances are tenant-isolated, reversible through ledger
entries, and cannot be granted or redeemed through forged client requests.

### 5.4 Optional first-party checkout

The merchant-direct boundary should remain the default until legal, support,
tax, fraud, settlement, and refund responsibilities are deliberately accepted.

If the business chooses to collect shopper payments:

- Create an explicit commerce-mode configuration and migration.
- Decide whether Nurava is merchant of record, marketplace facilitator, or agent.
- Add merchant settlement accounts, KYC, payout schedules, fees, refunds, and
  chargeback handling.
- Re-enable payment initiation only behind the selected mode.
- Recalculate totals server-side and reserve inventory transactionally.
- Prove webhook idempotency, reconciliation, and refund state transitions.
- Update terms, privacy, invoices, support responsibilities, and UI copy.
- Run legal and tax review before production.

**Definition of done:** payment, order, refund, settlement, and dispute states are
fully server-authoritative and accurately represented to shoppers and merchants.

### 5.5 Advanced billing and revenue operations

**Build:**

- Metered usage billing for storage, messages, API calls, or staff seats.
- Annual plans, coupons, trials by plan, prorations, and tax-inclusive pricing.
- Provider-neutral billing adapter with Stripe and future local providers.
- Dunning sequences, payment-method expiry, retry schedules, and account holds.
- Reconciliation reports by provider event, invoice, and local payment.
- Revenue recognition and export for accounting systems.

**Definition of done:** every invoice total is reproducible, every provider event
maps to one local state transition, and finance can reconcile a period.

## 6. P3: intelligence and scale

### 6.1 Advanced analytics and event tracking

**Current baseline:** database-derived revenue, orders, AOV, conversion, daily
sales, categories, top products, regions, payment methods, growth, and exports.

**Build:**

- First-party event model for views, searches, comparisons, enquiries, quote
  responses, conversions, and campaign interactions.
- Consent-aware analytics collection.
- Funnel and cohort reports.
- Storefront performance, search-zero-result, and conversion dashboards.
- Data warehouse or event pipeline for large tenants.
- Scheduled reports and anomaly alerts.

**Definition of done:** a merchant can trace a privacy-compliant funnel from
discovery to enquiry/confirmed sale, with event definitions documented.

### 6.2 Better recommendations and search

**Build:**

- Search index with typo tolerance, synonyms, facets, and zero-result logging.
- Merchant-controlled boosts, exclusions, and merchandising rules.
- Explainable recommendations using category, brand, price, and behavior.
- Cold-start rules for new stores/products.
- Offline evaluation set and click/conversion metrics.
- Optional AI-assisted product matching, with human review before publishing.

**Definition of done:** search latency, relevance, zero-result rate, and
recommendation conversion are measured rather than assumed.

### 6.3 AI merchant assistant

**Build carefully and with tenant boundaries:**

- Draft product descriptions, specifications, FAQs, support replies, and SEO
  metadata.
- Summarize tickets and produce next-action suggestions.
- Explain inventory anomalies and reorder recommendations.
- Use retrieval limited to the active tenant and approved records.
- Require human approval for pricing, customer promises, refunds, publication,
  and verification decisions.
- Log prompts, source records, outputs, actor, and approval state without
  storing unnecessary sensitive data.

**Definition of done:** the assistant cannot retrieve another tenant's data,
cannot perform privileged mutations without confirmation, and every generated
customer-facing result is reviewable.

### 6.4 Content and SEO management

**Build:**

- Merchant-managed blog/articles, landing pages, FAQs, and redirects.
- Structured metadata, sitemap controls, canonical URLs, and image alt text.
- Content draft/review/publish/rollback workflow using the existing versioning
  pattern.
- Per-store analytics for search impressions and landing-page conversion.
- Moderated shared platform editorial content.

**Definition of done:** content is host-aware, versioned, tenant-isolated, and
does not overwrite platform legal pages.

### 6.5 Mobile/PWA and offline operations

**Build:**

- Installable merchant PWA with secure session behavior.
- Offline product lookup and stock-count queue.
- Push notifications with consent.
- Camera barcode scanning.
- Conflict resolution when queued changes reconnect.
- Explicit offline indicators and safe retry behavior.

**Definition of done:** offline actions never silently overwrite newer server data,
and a user can understand what is queued, synced, rejected, or needs review.

### 6.6 Multi-region and localization

**Build:**

- Per-store locale and timezone formatting everywhere, not only in settings.
- Multi-currency display with a server-side currency policy.
- Translation keys for UI, emails, notifications, and legal content.
- Country-specific tax, address, phone, and payment adapters.
- Region-aware hosting/cache strategy only after tenant data residency is
  understood.

**Definition of done:** dates, money, phone numbers, legal documents, and
notifications use the correct store locale and country without changing stored
canonical values incorrectly.

## 7. Security, privacy, and governance upgrades

### 7.1 Stronger authentication

- Add passkeys/WebAuthn.
- Add TOTP or WebAuthn 2FA for merchants and platform users.
- Add recovery codes and trusted-device management.
- Add session list/revocation and suspicious-login alerts.
- Add optional enterprise SSO/SAML only after role mapping is defined.

### 7.2 Privacy center and retention controls

- Add merchant and shopper data-subject request workflows.
- Add consent records for marketing, analytics, and communication channels.
- Add data classification and field-level redaction.
- Add configurable retention schedules by record type.
- Add a deletion preview and legal-hold mechanism.
- Make retention-worker outcomes observable and reversible before destructive
  deletion where legally permitted.

### 7.3 Immutable audit and change control

- Add before/after values for sensitive mutations with redaction.
- Add actor, tenant, IP/device metadata, request ID, and reason.
- Prevent ordinary users from editing or deleting audit records.
- Add approval workflows for high-risk actions such as suspension, payout,
  verification approval, bulk price changes, and data deletion.
- Export audit records to append-only external storage.

### 7.4 Disaster recovery and supply-chain security

- Automated encrypted PostgreSQL backups with retention and restore drills.
- R2 object inventory and recovery test.
- Recovery time/recovery point objectives per plan.
- Dependency scanning, secret scanning, SBOM generation, and patch policy.
- Staging database anonymization and production-data access controls.
- Deployment rollback and migration rollback procedures.

## 8. Recommended implementation order

1. Invitation acceptance and multi-store switching.
2. Permission matrix and tenant-isolation regression suite.
3. Launch checklist, observability, billing sandbox, and backup/restore gates.
4. Merchant enquiry/CRM and quote workflow.
5. Bulk catalog, inventory ledger, purchase orders, and fulfillment workflow.
6. Notification templates, support inbox, saved views, and scheduled reports.
7. Entitlement enforcement and advanced billing.
8. Campaigns, loyalty, and retention features.
9. Event analytics, search/recommendations, AI assistant, and content tools.
10. Optional first-party checkout only after business/legal approval.
11. 2FA, privacy center, immutable audit, disaster recovery, and scale work.

## 9. Feature implementation checklist

Every future feature should ship with:

- a Prisma migration when data changes;
- tenant and membership scopes on every query;
- Zod/input validation and server-side authorization;
- idempotency for retries and provider callbacks;
- audit records for privileged actions;
- notification preference and failure handling;
- loading, empty, error, and unavailable states;
- responsive and keyboard-accessible UI;
- unit/integration tests;
- tenant-isolation tests;
- Playwright coverage for the critical user journey;
- environment/provider documentation;
- backup/restore impact review;
- migration and rollback notes; and
- a truthful manual update describing what is live versus configured.

## 10. Success metrics

Track these metrics after the underlying events are implemented:

- merchant activation rate from signup to published verified store;
- time from onboarding to first approved publication;
- invitation acceptance rate and time to first staff action;
- catalog import success rate and time saved;
- stockout rate, inventory accuracy, and reorder lead time;
- enquiry response time, quote conversion, and merchant-confirmed sales;
- support first-response and resolution time;
- notification delivery/failure/opt-out rate;
- trial-to-paid conversion, churn, failed renewal recovery, and expansion MRR;
- store discovery-to-enquiry conversion;
- search zero-result and recommendation conversion rate;
- uptime, error rate, webhook lag, backup success, and restore duration; and
- tenant-isolation/security incident count, with a target of zero.

Metrics must be derived from real events and records. Do not populate dashboards
with invented numbers merely to make an empty state look complete.

