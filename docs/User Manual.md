# Nurava Tech SaaS User Manual

**Product:** Nurava Tech hosted multi-store electronics platform  
**Primary domain:** https://nuravatech.com  
**Market defaults:** Kenya, English, en-KE, KES, Africa/Nairobi  
**Repository audit:** 22 August 2026

This manual describes how the application works for shoppers, merchants,
platform operators, and developers. It is based on the current source, Prisma
schema, route handlers, and committed documentation. A feature is implemented
in source unless it is explicitly marked provider-dependent, operationally
gated, historical, or a known gap.

## 1. Product model and the most important boundary

Nurava Tech is a SaaS platform for independent electronics merchants. It has
four distinct experiences:

1. **Platform discovery:** the root domain and /stores help shoppers discover
   eligible stores.
2. **Merchant storefronts:** each tenant has its own catalog, branding,
   homepage, contact details, domain, and host.
3. **Merchant workspace:** authorized store users manage products, stock,
   orders, support, design, domains, verification, team, analytics, exports,
   and subscription billing.
4. **Platform control plane:** Nurava operators manage tenants, verification,
   plans, add-ons, billing visibility, operations, and suspension.

The current commerce model is <code>MERCHANT_DIRECT</code>. Nurava provides
discovery, hosting, catalog presentation, and SaaS tools. The independent
merchant is responsible for the final shopper price, payment, delivery, taxes,
refunds, warranty, and sale contract.

The shopper cart and handoff page prepare an enquiry and provide WhatsApp/email
links. New shopper order creation and shopper payment initiation are closed at
the server boundary. Existing order/payment records and compatibility helpers
remain for historical data, testing, and separate SaaS billing.

SaaS billing is different: merchant owners can pay Nurava plan, setup-fee,
renewal, and add-on invoices through the configured platform provider.

## 2. Tenants, hosts, and isolation

### Host resolution

The server identifies the active tenant from the request host. A client cannot
select a tenant by submitting an arbitrary tenant ID in a query string, cookie,
or request body.

- Platform hosts: nuravatech.com, www.nuravatech.com, and local
  localhost/127.0.0.1.
- Local merchant preview: {store-slug}.localhost.
- Production platform subdomain: {store-slug}.nuravatech.com when DNS and
  deployment routing are configured.
- Custom domain: a recorded, DNS-verified store hostname.

Canonical platform hosts are resolved before merchant domain lookup. Public
storefront resolution also requires an eligible tenant status, approved
merchant verification, and PUBLISHED store status. Authorized workspace routes
may resolve an unpublished store.

### Lifecycle states

Tenant status is TRIALING, ACTIVE, PAST_DUE, GRACE_PERIOD, SUSPENDED,
CANCELLED, or DELETED. Store publication status is DRAFT, PUBLISHED, or
SUSPENDED. Merchant verification status is NOT_STARTED, IN_PROGRESS,
PENDING_REVIEW, APPROVED, REJECTED, or SUSPENDED.

Suspension, failed verification, unverified domains, and unpublished stores
must not be presented as live public stores.

### Isolation rule

Every tenant-owned read and write must use the server-resolved tenantId and,
where relevant, storeId. This protects products, categories, carts, wishlists,
orders, reviews, coupons, tickets, analytics, billing, verification, exports,
settings, and logs from cross-store access.

User.preferredStoreId is only a discovery convenience. It is not an
authorization mechanism.

## 3. Roles and access

| Audience | Role | Main responsibility |
|---|---|---|
| Shopper | CUSTOMER | Browse, save products, enquire with a merchant, and view permitted account data |
| Legacy admin | ADMIN / SUPERADMIN | Broad /admin operational console |
| Merchant | STORE_OWNER | Tenant ownership, billing, verification, team, publication, and operations |
| Merchant administrator | STORE_ADMIN | Most store operations and approved settings |
| Store manager | STORE_MANAGER | Operational products, orders, inventory, and delivery work |
| Store support | STORE_SUPPORT | Customer/support work where permitted |
| Store editor | STORE_EDITOR | Catalog/content and approved design editing |
| Platform operator | PLATFORM_OWNER / PLATFORM_ADMIN | Plans, tenants, billing, verification, and platform controls |
| Platform support | PLATFORM_SUPPORT | Platform support and review surfaces |
| Platform analyst | PLATFORM_ANALYST | Platform reporting and read-oriented control-plane work |

Middleware requires authentication for /account, /cart, /checkout, /manage,
/platform, and /admin. Server membership/role guards then enforce access to
sensitive data and mutations.

## 4. Shopper guide

### Platform discovery and merchant storefronts

The platform root shows database-backed discovery groups for top-rated,
most-reviewed, and new/growing stores. Cards can include approved ratings,
review counts, product counts, catalog previews, store names, and host links.
Fallback branding may be shown when live data is unavailable; fallback content
does not prove that a live merchant record exists.

/stores is the browse-all directory. Browse Stores belongs to platform
navigation and is not inserted into an individual merchant's navigation.

On a merchant host, the homepage provides the merchant hero, category grid,
featured products, testimonials, newsletter, contacts, phone/email/WhatsApp
links, map links, and shopper footer links. Published Store settings overlay
safe defaults from frontend/src/config/client.config.ts and never another
tenant's settings.

### Catalog, search, and comparison

Public pages include:

- /products — searchable, paginated catalog;
- /products/{product-slug} — product detail;
- /category/{category-slug} — dynamic category page;
- /deals — deal discovery;
- /compare — side-by-side comparison; and
- the global search overlay, including the Ctrl+K shortcut.

Catalog filters include search, category, brand, price range, in-stock,
on-sale, featured/new-arrival filters, sorting, and pagination. Product detail
can show image gallery/zoom, base and discounted prices, stock, warranty,
flexible specifications, variants, reviews, sticky add-to-cart controls, and
similar-product recommendations.

Recommendation services also support personalized, trending, featured,
new-arrival, and deal modes. Results improve as tenant data grows.

Light/dark presentation uses approved theme presets. Preference is persisted
locally and can be saved to a signed-in account.

### Cart and merchant handoff

CartProvider stores cart state in browser localStorage and supports:

- add, remove, quantity changes, and variant-aware merging;
- stock-aware quantity clamping;
- selecting items for the current enquiry;
- save for later and move back to cart;
- subtotal, default shipping estimate, and total display; and
- the configured free-shipping threshold (the default is KES 50,000).

/cart and /checkout require sign-in in the current implementation. The checkout
page does not take payment. It builds a merchant enquiry and exposes WhatsApp
and email contact paths. The merchant confirms availability, final price,
delivery, payment instructions, taxes, returns, and warranty.

Do not describe a cart item as a completed platform order or payment.

### Account and authentication

Signed-in account pages are:

- /account — overview;
- /account/orders, /account/orders/{id}, and /account/orders/{id}/track —
  permitted historical orders and tracking;
- /account/addresses — saved addresses;
- /account/wishlist — saved products;
- /account/notifications — read/unread notifications; and
- /account/settings — profile, theme, notification preferences, and profile
  image upload.

Profile uploads accept JPG, PNG, WEBP, and GIF up to 5 MB and use generated
storage keys.

Authentication pages are /auth/signup, /auth/signin, /auth/verify-email,
/auth/forgot-password, and /auth/reset-password. NextAuth v5 supports Google
OAuth and bcrypt-backed credentials with JWT sessions. Credential login
successes and failures are recorded as LoginEvent records when the database is
available.

### Public information and support

Public pages include About, Blog, Contact, FAQs, Warranty, Return Policy,
Privacy Policy, Cookie Policy, and Terms and Conditions. Contact submission
creates a support ticket and attempts Resend notifications. Newsletter
submission validates and acknowledges an email; durable campaigns still require
a mailing-list provider.

Merchant-host policy/support copy is shopper-facing. Platform-host policy,
support, and billing copy is merchant/SaaS-facing.

## 5. Merchant guide

### Create a store

1. Sign in or create and verify an account.
2. Open /onboarding.
3. Enter a store name and optional lowercase slug.
4. Select an active plan when plan data is available.
5. Accept the current merchant terms and privacy notice.
6. Create the store.

Onboarding creates the tenant, store, owner membership, 30-day trial dates,
subscription, billing customer, billing record, platform-subdomain record, and
trial-start legal acceptance in one transaction. A store starts as a draft and
still needs verification and publication.

The onboarding page lists the user's memberships. Current tenant selection is
host-based; a first-class multi-store switcher is a future update.

### Workspace areas

/manage redirects to /manage/dashboard and uses a tenant-scoped workspace.

| Area | Function |
|---|---|
| Dashboard | Store summary and quick actions |
| Analytics | Revenue, orders, AOV, conversion, product, category, region, payment, and growth reports |
| Products | Create, inspect, edit, search, filter, and remove products where allowed |
| Orders | View store orders and update operational status/tracking |
| Customers | Store customer summaries and order history metrics |
| Team access | Invite staff and inspect pending invitations |
| Reviews | Approve, reject, flag, and moderate reviews |
| Deliveries | Monitor delivery-oriented order records |
| Support | Manage tickets, replies, status, priority, category, and messages |
| Settings | Store/account configuration |
| Store design | Draft, preview, publish, and roll back storefront settings |
| Domains | Add and inspect custom hostnames |
| Subscription | Plans, invoices, setup fee, renewals, cancellation, and add-ons |
| Verification | Profile, phone OTP, and evidence submission |
| Data export | Download a tenant-scoped JSON export |
| Security / Activity | Exposed security and audit information |

### Catalog and inventory

Products have name, slug, description, brand, SKU, base/discount price, stock,
warranty, dimensions, weight, JSON specifications, images, category,
featured/new-arrival flags, and variants. Variants can represent color,
storage, RAM, or another option and have their own SKU, stock, and price
modifier.

Product input is Zod-validated. Protected image upload accepts image files up
to 5 MB and stores them in R2. Products with order history should not be
deleted; preserve them and set stock to zero where appropriate.

Inventory provides stock value, low-stock/out-of-stock lists, warning/critical
alerts, reorder suggestions based on sales velocity, product/variant updates,
and stock movement history.

Order statuses are PENDING, CONFIRMED, PROCESSING, SHIPPED, OUT_FOR_DELIVERY,
DELIVERED, and CANCELLED. Authorized changes can notify customers and store a
tracking number. Delivery execution remains the merchant's responsibility.

### Reviews, coupons, customers, and support

Reviews are signed-in submissions with 1–5 rating, title/comment/photos, and
server-detected verified-purchase state. Moderation statuses are PENDING,
APPROVED, REJECTED, and FLAGGED. Public discovery should use approved reviews.

Coupons support a code, percentage or fixed discount, minimum order value,
expiry, usage limit, used count, and active flag. Validation checks the
database, not browser totals.

Support tickets contain customer identity/contact, subject, description,
category, priority, status, optional order link, attachments, assignment, and
threaded replies. Categories are TECHNICAL, BILLING, SHIPPING, PRODUCT, and
OTHER. Priorities are LOW, MEDIUM, HIGH, and URGENT. Statuses are OPEN,
IN_PROGRESS, WAITING_CUSTOMER, RESOLVED, and CLOSED. Status changes attempt
customer email notifications.

### Design, drafts, publication, and rollback

The design editor can change the store name, approved theme preset, hero title,
highlight/description, SEO description, phone, email, WhatsApp number,
business hours, response time, address, city/country, free-shipping threshold,
and default shipping cost.

Save draft persists to the server when available. If the database is unavailable,
the editor can keep a local browser preview, but it is not public and cannot
publish. Publishing requires owner/admin access, approved merchant
verification, current merchant legal acceptance, and a saved draft.

Every publication creates StoreSettingsVersion. Rollback creates a new version
from an earlier version, preserving history. Publication does not prove DNS,
SSL, provider, email, or deployment readiness.

### Merchant verification

Owner/admin users submit business type, tax status, location type, settlement
account type, legal identity, phone, registration number when applicable, KRA
PIN when applicable, location, and settlement details.

Sensitive details are encrypted and are not returned in ordinary status
responses. Merchant email verification is required first. A six-digit phone OTP
is sent through the configured SMS provider; it expires after 10 minutes,
requests are rate-limited, and incorrect attempts are capped.

Evidence accepts PDF, JPG, PNG, and WEBP files up to 10 MB in a separate private
R2 bucket. Required evidence is government ID, location proof, M-Pesa
ownership, business registration or owner declaration, and KRA PIN when
applicable. Completion enters PENDING_REVIEW. Platform approval is required
before public selling or publication.

### Domains

The Domains page creates a custom hostname record and displays the DNS
verification record. DNS and SSL are configured outside the application. The
server displays verification and SSL state and must not assume a hostname works
just because it was entered.

### Team access

Owner/admin users can invite an email with a store role. Invitation tokens are
hashed, expire after seven days, and are limited by plan staff entitlements.
The API returns a manual invite link.

**Known gap:** the route tree has invitation API plumbing but no current
/auth/accept-invitation browser page. Do not promise a complete self-service
invitation journey until that page is implemented and tested.

### Data export

Store owners can download a tenant-scoped JSON export containing tenant/store
identity and settings, memberships, domains, settings versions, categories,
products/variants, orders/items, payment metadata, reviews, coupons, support
tickets/replies, and merchant legal acceptances. It is not a disaster-recovery
backup and must be handled as sensitive business data.

## 6. SaaS billing

Plans are database records with price, currency, monthly/yearly interval, setup
fee, active state, optional Stripe price ID, and JSON entitlements. Development
seed examples are Starter (KES 1,500/month, KES 5,000 setup), Business (KES
3,500/month, KES 5,000 setup), and Enterprise (KES 8,500/month, KES 1,500
setup). They are configurable seed values, not a live price promise.

/manage/billing exposes the active plan, trial/current period, grace and
cancellation state, setup-fee status, invoices, SaaS payment history, plan
checkout/change, renewal, cancellation, Stripe portal where enabled, and
add-on actions.

At launch configuration, M-Pesa is invoice-driven. Setup fee and first
subscription payment are collected together after the trial. Later renewals
create a local invoice and initiate a Daraja STK request. A successful callback
updates invoice, payment, subscription, tenant, and setup-fee state. It is not
an automatic recurring M-Pesa debit.

Stripe Checkout, portal, subscription/invoice synchronization, and signed
webhooks remain provider-ready and should only be advertised after live
configuration and sandbox tests pass. Seed add-ons include WhatsApp
notifications, advanced analytics, and extra staff accounts. Stripe recurring
items work when an add-on Stripe price exists; otherwise M-Pesa can include the
charge in the next invoice.

Shopper transaction commissions are disabled in merchant-direct mode. Historical
commission records remain for reconciliation.

The lifecycle worker applies subscription expiry/grace decisions and the
approved 90-day merchant-data retention policy while preserving SaaS billing
and legal records. Scheduling, monitoring, backup, and restore must be
configured before this is production-operated.

## 7. Platform control plane

Platform roles and SUPERADMIN can access:

- /platform — control-plane overview;
- /platform/operations — cross-store metrics, tenant/store search, product/order/
  support counts, verification, subscription/setup-fee summaries, activity,
  invoices, previews, and authorized suspension/reactivation;
- /platform/tenants — tenant listing surface; and
- /platform/billing — plans, add-ons, subscriptions, customers, paid revenue,
  invoices, failed SaaS payments, and historical commission visibility.

Review actions include request verification, approve, and reject. Approval is
blocked until profile, phone, and required approved evidence are complete.
Suspension or rejected verification can suspend public publication.

The platform overview deliberately shows unavailable-state messaging when the
database/provider is not configured; it must not fabricate tenant or revenue
metrics.

## 8. Legacy admin console

/admin redirects to /admin/dashboard and is protected for ADMIN/SUPERADMIN. It
is separate from the merchant workspace and includes Dashboard, Analytics,
Products, Orders, Customers, Reviews, Coupons, Inventory, Deliveries, Support
Tickets, Messages, Settings, Store Design, Billing, Security, and Activity Log.

Security reports credential login events and administrator accounts. Activity
supports action/search filters, pagination, detail inspection, and CSV export.
Privileged product, order, coupon, review, and platform mutations are intended
to create AdminLog audit records.

## 9. API and service map

Browser pages call the Next.js App Router handlers under frontend/src/app/api,
which use Prisma-backed controllers/services.

**Public/shopper:** /api/products, /api/products/{slug},
/api/products/upload, /api/recommendations, /api/reviews, /api/wishlist,
/api/cart, /api/cart/{id}, /api/orders, /api/orders/{id},
/api/orders/{id}/tracking, /api/coupons/validate, /api/contact,
/api/newsletter, /api/store-preference, /api/account/addresses,
/api/account/addresses/{id}, /api/account/notifications, and
/api/account/settings.

**Authentication/onboarding:** /api/auth/[...nextauth], /api/auth/register,
/api/auth/verify-email, /api/auth/resend-verification,
/api/auth/forgot-password, /api/auth/reset-password,
/api/onboarding/store, and /api/invitations/accept.

**Merchant workspace:** /api/manage/billing, /api/manage/data-export,
/api/manage/domains, /api/manage/store/settings,
/api/manage/store/publish, /api/manage/store/rollback,
/api/manage/team/invitations, /api/manage/verification,
/api/manage/verification/phone, /api/manage/verification/evidence,
/api/analytics, /api/analytics/export, and /api/inventory.

**Admin/platform:** /api/admin/customers, /api/admin/orders,
/api/admin/deliveries, /api/admin/deliveries/{id}, /api/admin/coupons,
/api/admin/reviews, /api/admin/security, /api/admin/logs,
/api/platform/billing, /api/platform/operations,
/api/platform/verification/{tenantId}, /api/billing/plans, and /api/health.

**Payments:** /api/payments/webhooks/stripe,
/api/payments/webhooks/mpesa/stk-callback,
/api/payments/webhooks/mpesa/c2b, plus legacy
/api/payments/mpesa/initiate, /api/payments/mpesa/verify,
/api/payments/card/create-intent, and /api/payments/card/verify. The last
four fail closed at the merchant-direct boundary for new shopper payments.

## 10. Integrations

| Service | Responsibility |
|---|---|
| PostgreSQL/Neon | Prisma data, tenant isolation, rate-limit buckets, webhook receipts |
| Resend | Verification, recovery, order, and support email |
| Cloudflare R2 | Public product/profile files and private verification evidence |
| Twilio | SMS order, support, and verification messages |
| WhatsApp Cloud API | Customer/merchant notifications and enquiry support |
| M-Pesa Daraja | SaaS invoice STK and callbacks |
| Stripe | Provider-ready SaaS Checkout/portal/webhooks |
| Google OAuth | Optional sign-in provider |

Missing optional credentials produce clear not-configured behavior in many
paths. That is development fallback, not live verification.

## 11. Database reference

Identity models are User, Account, Session, and VerificationToken. Tenant
models are Tenant, Store, Domain, Membership, and Invitation. Trust models are
MerchantVerificationProfile, MerchantVerificationEvidence, and
MerchantLegalAcceptance. Billing models are Plan, Subscription, UsageCounter,
BillingCustomer, BillingRecord, Addon, AddonSubscription, Invoice, Payment,
Transaction, FeatureEntitlement, and StoreSettingsVersion.

Catalog models are Category, Product, and Variant. Shopper/commerce models are
CartItem, WishlistItem, RecentlyViewed, Order, OrderItem, Address, and
DeliveryRegion. Service models are Review, Coupon, Notification, SupportTicket,
and TicketReply. Operations/security models are AdminLog, LoginEvent,
RateLimitBucket, and WebhookReceipt.

## 12. Security and reliability

The source includes server session checks, role/membership guards, host-derived
tenant context, tenant-scoped queries, bcrypt, input/object/email
sanitization, PostgreSQL-backed distributed rate limiting, encrypted
verification details, private R2 evidence, short-lived document links, OTP
expiry/attempt limits, timing-safe OTP comparison, webhook signature
validation, webhook deduplication, historical idempotency handling, audit
records, and login events.

These controls do not replace production security review, secret rotation,
2FA/SSO, vulnerability management, backups, monitoring, or legal/privacy
review.

## 13. Installation and release operations

Prerequisites are Node.js 18+, npm 9+, and PostgreSQL/Neon. Local setup:

~~~bash
npm install
npm run db:push
npm run db:seed
npm run dev
~~~

Development seeding requires SEED_ADMIN_PASSWORD of at least 16 characters and
is blocked in production. It creates sample plans, add-ons, the Nurava
tenant/store, categories, products, and development admin data.

For production use committed migrations and explicit administrator credentials:

~~~bash
npm run check:env
npm run db:deploy
npm --workspace backend run db:init-admin
npm --workspace backend run build
npm --workspace frontend exec tsc -- --noEmit --incremental false
npm test
npm run build
~~~

Never commit .env.local, provider secrets, encryption keys, or database URLs.

Validation also includes npm run test:e2e, npm run check:staging, and
npm run check:backup. Source/type/schema checks do not prove a reachable
database, applied migration, working DNS/SSL, provider webhook, email delivery,
backup restore, or deployed browser behavior.

## 14. Troubleshooting

| Symptom | Check |
|---|---|
| Store unavailable | Tenant status, verification, publication, domain state, database |
| Design is local preview | Database unavailable; local draft is not public |
| Billing empty | Tenant/subscription records, provider, live DB |
| Payment not configured | Required provider variables and webhook setup |
| Images have no public URL | R2 public bucket configuration/upload |
| No email/SMS/WhatsApp | Provider credentials, sender approval, number formatting |
| Shopper cannot pay | Expected in merchant-direct mode; use merchant enquiry |
| Data appears from wrong store | Correct verified host; tenant context is host-derived |
| Invitation link fails | Known missing acceptance page; see Future Updates |
| Platform metrics blank | Intentional unavailable-state behavior without live data |

## 15. Source of truth

- Frontend pages: frontend/src/app/**.
- API routes: frontend/src/app/api/**.
- Tenant resolution: backend/lib/tenant.ts and
  frontend/src/lib/store-context.server.ts.
- Access guards: backend/lib/tenant-access.ts and frontend/src/lib/tenant-auth.ts.
- Database contract: backend/prisma/schema.prisma and migrations.
- Defaults/customization: frontend/src/config/client.config.ts and
  frontend/src/config/theme-presets.ts.
- Feature inventory: docs/features.md.
- Architecture: docs/saas-architecture-decisions.md.
- Client setup: docs/client-customization.md.
- Future roadmap: [Future Updates.md](Future%20Updates.md).

