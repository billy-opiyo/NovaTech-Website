# Nurava Tech — Features

## 🏠 Public Storefront

| Feature | Description |
|---------|-------------|
| **Platform Homepage** | The platform root is a store-discovery experience with social-proof groups for top-rated, most-reviewed, and new/growing stores. It shows approved review ratings, review volume, product counts, catalogue image previews, and store links. |
| **Merchant Store Homepage** | Each resolved merchant host keeps its own hero, shop-by-category grid, featured products carousel, customer testimonials, newsletter, contact details, and map sections. |
| **Store Directory** | Public `/stores` directory for approved, published stores with featured product context, links to each store host, and an explicit browse-all option for returning shoppers. `Browse Stores` and platform discovery controls stay outside individual merchant navigation. |
| **Store Host Routing** | Local previews support `{store-slug}.localhost`; the configured platform host and explicit `/store/{slug}` paths preserve platform/store context; production links use `{store-slug}.{PLATFORM_DOMAIN}` when DNS and deployment routing are configured. |
| **Products Catalog** | Full product listing with brand filters, price range, in-stock/on-sale toggles, category filtering, sorting (newest, price, rating), search, and pagination. |
| **Product Detail** | Image gallery with zoom, product variants, pricing, stock status, warranty info, reviews section, sticky add-to-cart, and API-backed similar-product recommendations. |
| **Category Pages** | Dedicated category landing pages (Phones, Laptops, Tablets, Accessories) with subcategories. |
| **Deals Page** | Promotional deal cards linking into filtered product listings. |
| **Compare Page** | Side-by-side product comparison with spec tables and highlight win/loss indicators. |
| **Search Overlay** | Responsive global search with `Ctrl+K` shortcut, popular searches, live product suggestions, keyboard-friendly navigation, and mobile positioning. |
| **Theme System** | Client-configured light/dark theme presets backed by CSS variables, with localStorage persistence and flash-free initialization before the first paint. |
| **Responsive and Accessible UI** | Shared responsive layouts across desktop and mobile breakpoints, with clearer labels, focus states, semantic status messaging, and accessible live notifications. |
| **Public Information Pages** | About, Blog, Contact, FAQs, Warranty, Return Policy, Privacy Policy, Cookie Policy, and Terms and Conditions pages. |

## 🛒 Product Selection & Merchant Handoff

| Feature | Description |
|---------|-------------|
| **Cart Context** (`CartProvider`) | Client-side cart state persisted to `localStorage`:<br>- Add / remove / update quantity items<br>- Variant-aware item merging<br>- Max-stock clamping<br>- **Save for later** / **Move to cart**<br>- Subtotal, shipping estimate (free shipping over KES 50,000), and total calculations |
| **Cart Page** | Item list with quantity controls, selection summary, save-for-later section, and direct merchant handoff. |
| **Merchant Handoff Page** | Collects consented shopper contact details, persists a tenant-scoped enquiry with server-authoritative product snapshots, then opens WhatsApp/email links to the independent store. The merchant confirms price, delivery, payment, refunds, and warranty directly. |

## 👤 Authentication

| Feature | Description |
|---------|-------------|
| **NextAuth v5** | Two providers:<br>- **Google OAuth**<br>- **Credentials** (email + password, verified with `bcrypt`)|
| **JWT Sessions** | Role-based (`CUSTOMER`, `ADMIN`, `SUPERADMIN`) with user ID attached to sessions.|
| **Sign-in/Sign-up Pages** | Form validation and error handling.|
| **Email Verification** | Six-digit verification-code flow after registration, with resend support and expiry handling.|
| **Merchant Invitation Acceptance** | Hashed seven-day invitation tokens, store/role preview, invited-email matching, existing/new account continuation, atomic membership activation, and Resend/manual delivery.|
| **Password Recovery** | Forgot-password email flow and token-based password reset page.|
| **Session Protection** | `getServerSession()` helper used across API routes for protected endpoints.|
| **Account Loading and Route Guards** | Loading states for account screens and middleware protection for authenticated account routes.|
| **Account Identity and Session Continuity** | Authenticated navigation shows the user's avatar when available or a capitalized name initial as fallback. Account menus expose Account and Sign out, and sign-out returns to the current platform/store context instead of replaying the platform splash. |

## 🎨 Client Customization and Shared UX

| Feature | Description |
|---------|-------------|
| **Client Configuration and Store Context** | `frontend/src/config/client.config.ts` remains the safe code fallback for branding, contact details, navigation, SEO, homepage content, commerce defaults, social links, and feature flags. Published store settings are resolved through the active `StoreContext`. |
| **Theme Presets** | Reusable visual systems in `frontend/src/config/theme-presets.ts`, selected through `themePreset` without recoding individual pages. |
| **Profile Images** | Account settings support JPG, PNG, WEBP, and GIF uploads up to 1 MB, with generated profile storage keys and R2-backed storage. |
| **Image Optimization and Limits** | Image uploads are limited to 1 MB across supported upload surfaces; product images are compressed to WebP in the browser/server pipeline when possible, while verification PDFs use a separate 10 MB limit. |
| **Branded Splash and Loading UI** | The platform homepage renders the responsive gradient splash immediately to avoid a blank navy flash; the splash and route loading UI remain limited to the platform homepage/control plane, while merchant storefront and admin routes open without it. |
| **Shared Notifications** | Toast notifications with success, error, and informational states, dismissal controls, `aria-live` announcements, a maximum visible set, viewport-safe sizing, and automatic dismissal after four seconds. |
| **Action Feedback** | Important asynchronous actions use loading spinners/disabled states and completion or failure notifications, including authentication, uploads, saves, deletes, invitations, and other protected mutations. |
| **Onboarding Merchant Guide** | The platform homepage includes nine preview-only instructional cards that mirror the merchant store-creation path. Cards support timed advance, previous/next controls, pagination, touch swipes on smaller screens, light/dark preview alignment, and a final-step-only Create Store CTA. |
| **Platform Access Invitations** | Super Admins can invite `PLATFORM_ADMIN`, `PLATFORM_SUPPORT`, and `PLATFORM_ANALYST` operators through `/platform/access`; links are invited-email-bound, one-time, and expire after seven days. |
| **Responsive Navigation** | Merchant storefronts provide desktop/mobile search, cart, account, notification, and floating actions. The platform homepage provides `Home`, `Browse Stores`, and `Create Store` links plus theme control, while its footer provides merchant support links and merchant storefronts provide shopper service links plus a `Nurava Tech Homepage` return link. |

## 👑 Admin Panel

| Feature | Description |
|---------|-------------|
| **Admin Layout** | Collapsible sidebar (desktop) + slide-in mobile sidebar with sections: Dashboard, Analytics, Products, Orders, Customers, Reviews, Deliveries, Support Tickets, Messages, Settings, Security, Activity Log.|
| **Top Bar** | Search and notifications badge.|
| **Admin Products Page** | Full CRUD-style UI with:<br>- Stats cards (total products, active, out of stock, drafts)<br>- Search, status filters (active/draft/out-of-stock/archived), sorting<br>- Bulk selection, table rows with product details, stock levels, sales, ratings<br>- Delete confirmation modal.|
| **Merchant Enquiries and Quotes** | `/manage/enquiries` lists tenant-scoped shopper handoffs, supports search/status updates/internal notes, and lets owners/admins create and email quotes with delivery fees, terms, expiry, and unique references. |
| **Catalog Import/Export** | `/manage/catalog` provides CSV template download, current-catalog CSV export, preview validation, SKU-based create/update import, entitlement checks, partial success reporting, and audit records. |
| **Launch Readiness** | `/manage/readiness` reports server-backed PASS/PENDING/FAIL publication checks and the publish API blocks incomplete required checks. |
| **Centralized Store Permissions** | Server-side role matrix protects priority merchant mutations across catalog, orders, support, reviews, analytics, billing, domains, verification, team, enquiries, publishing, and exports. |
| **Operational Observability** | Critical operational responses expose request IDs, structured failure events carry safe tenant/actor/route context, and `/api/health` reports application/database state. |
| **Admin Orders Page** | Order management table with status tracking.|
| **Admin Analytics** | Growth comparison calculations (period-over-period), CSV/JSON export functionality, real-time growth data in metric cards.|
| **Admin Customers Page** | Customer listing with filters and details.|
| **Admin Reviews Page** | Reviews moderation with filters and status updates, plus controlled admin edit and delete operations.|
| **Admin Coupons Page** | Coupon management with creation, editing, and deletion.|
| **Admin Inventory Page** | Stock management with low-stock detection, alerts, and reorder suggestions.|
| **Admin Deliveries Page** | Delivery tracking and management.|
| **Admin Support Tickets Page** | Full ticket management with real-time listing, filters, conversation view, reply functionality, and status updates with automatic customer notifications.|
| **Admin Messages Page** | Customer support message management.|
| **Admin Settings Page** | Platform configuration options.|
| **Activity Log** | Audit trail of admin actions.|

## 💼 SaaS Billing

| Feature | Description |
|---------|-------------|
| **Database-backed plans** | Starter, Business, and Enterprise records are stored in Prisma/PostgreSQL with configurable prices, billing intervals, entitlements, setup fees, and Stripe price IDs. Legacy commission-rate fields remain for historical compatibility. |
| **Merchant billing dashboard** | `/manage/billing` shows the active plan, lifecycle state, setup-fee status, add-ons, VAT/credit-aware invoices, SaaS payment history, renewal, cancellation, upgrade, downgrade, and payment-method actions. |
| **M-Pesa SaaS collection** | At launch, setup fees and the first subscription are combined after the trial; later renewals create local invoices and Daraja STK requests. Callbacks confirm or fail the invoice/payment and update subscription state. This is invoice-driven rather than an automatic recurring charge. |
| **Future provider support** | Stripe provider helpers and historical webhook synchronization remain available behind the billing-provider boundary but are not presented as an active launch payment method. |
| **Add-ons** | Admin-managed add-ons can be subscribed/unsubscribed by merchant owners/admins. In M-Pesa-only launch mode, an add-on remains pending until the next successful invoice callback, then its entitlement activates. |
| **Plan entitlement enforcement** | Product, staff, custom-domain, storage, analytics-level, and WhatsApp-notification capabilities are checked server-side. Product-image uploads create tenant-scoped storage records and are blocked when the plan limit is reached. |
| **Transaction commissions** | New shopper transaction commissions are disabled because each independent merchant completes its own sale. Existing historical records remain visible for reconciliation. |
| **Platform billing control plane** | `/platform/billing` provides platform-role-protected plan/add-on management, subscription/customer visibility, paid invoice revenue, legacy commission visibility, invoices, and failed SaaS payments. |
| **Platform operations control plane** | `/platform/operations` provides Super Admin and platform-role-protected cross-store metrics, tenant/store search and filtering, product/order/support counts, subscription/setup-fee status, merchant verification review actions, recent activity and invoices, storefront preview links, and authorized suspension/reactivation controls. |
| **Secure merchant verification** | `/manage/verification` collects encrypted merchant details, verifies the merchant phone by OTP, and uploads evidence to a separate private R2 bucket. Platform reviewers use restricted verification routes and short-lived document links; approval is required before publication or selling. |
| **Lifecycle and retention worker** | `backend/workers/lifecycle.ts` applies subscription expiry/grace transitions, processes 90-day merchant-workspace retention, 12-month closed-enquiry retention, and due private verification-file deletion while preserving 7-year SaaS billing/legal records. Deployment scheduling remains an operational gate. |

## 📦 Backend API (App Router Route Handlers)

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/products` | GET, POST | Filtered product listing (search, category, brand, price, stock, sale, featured, new arrivals, sort, paginate) and admin-only product creation with Zod validation. |
| `/api/reviews` | GET, POST, PUT, DELETE | Paginated review listing per product, create review (verified-purchase detection), update own reviews, delete own or admin reviews. |
| `/api/wishlist` | GET, POST, DELETE | Read / add / remove wishlist items for authenticated users. |
| `/api/orders` | GET, POST | List historical authenticated-user orders; new shopper order creation returns a merchant-direct response. |
| `/api/orders/[id]` | GET, PATCH | Fetch single order (owner or admin), admin updates order status / tracking number with user notification. |
| `/api/coupons/validate` | POST | Real coupon validation against DB (expiry, usage limit, active flag, min order value) and discount calculation. |
| `/api/contact` | POST | Creates a support ticket and sends email via Resend (support team + customer confirmation). |
| `/api/enquiries` | POST | Rate-limited public merchant-direct enquiry creation; resolves the store from the host and snapshots authoritative product values. |
| `/api/invitations/accept` | GET, POST | Previews and atomically accepts a hashed, expiring invitation for the authenticated invited email. |
| `/api/manage/enquiries` | GET, PATCH | Tenant-scoped merchant enquiry search, status, notes, tags, and assignment updates. |
| `/api/manage/enquiries/{id}/quote` | POST | Owner/admin-only quote creation and email delivery for an enquiry. |
| `/api/manage/catalog/import` | POST | Owner/admin/manager/editor CSV preview or partial commit with validation, SKU matching, entitlement checks, and audit reporting. |
| `/api/manage/catalog/export` | GET | Tenant-scoped CSV catalog export for authorized store users. |
| `/api/manage/readiness` | GET | Tenant-scoped publication and domain readiness checklist with server-backed check sources. |
| `/api/health` | GET | Database-aware health response with safe application state and request correlation ID. |
| `/api/newsletter` | POST | Requires explicit consent and stores a tenant-scoped newsletter subscription. |
| `/api/newsletter/unsubscribe` | POST | Removes promotional newsletter consent for the current store without revealing whether an address was previously subscribed. |
| `/api/products/upload` | POST | Admin product image upload to Cloudflare R2; product images are optimized to WebP when possible and remain limited to 1 MB after validation. |
| `/api/platform/access/invitations` | GET, POST | Super Admin-only platform operator listing and seven-day invitation creation. |
| `/api/platform/access/accept` | GET, POST | Preview and atomically accept a platform invitation for the invited email. |
| `/api/auth/[...nextauth]` | GET, POST | NextAuth handlers. |
| `/api/billing/plans` | GET | Lists active database-backed SaaS plans and add-ons. |
| `/api/manage/billing` | GET, POST | Tenant-scoped merchant billing reads and owner/admin billing actions. |
| `/api/platform/billing` | GET, POST | Platform-role-protected plan/add-on management and billing reporting. |
| `/api/platform/operations` | GET, PATCH | Cross-store platform metrics, tenant activity, store previews, billing summaries, merchant verification review, and authorized store status controls. |
| `/api/manage/verification` | GET, POST | Tenant-scoped verification status and encrypted profile submission; sensitive values are not returned in status responses. |
| `/api/manage/verification/phone` | POST, PATCH | Rate-limited merchant phone OTP request and confirmation. |
| `/api/manage/verification/evidence` | GET, POST | Tenant-scoped private evidence metadata and upload handling. |
| `/api/platform/verification/[tenantId]` | GET | Restricted platform reviewer view of a merchant verification submission. |

## 🔐 Backend Services & Utilities

| Service / Utility | Description |
|-------------------|-------------|
| `backend/lib/db.ts` | Prisma client singleton for dev hot-reload safety. |
| `backend/lib/permissions.ts` | Centralized tenant membership role-to-permission matrix. |
| `backend/lib/launch-readiness.ts` | Server-backed publication and canonical-domain readiness checks. |
| `backend/lib/observability.ts` | Safe request IDs, structured events, and response correlation. |
| `backend/lib/email.ts` | Resend email sending with branded order-confirmation template. |
| `backend/lib/storage.ts` | Cloudflare R2 file operations (upload, delete, signed-URL generation). |
| `backend/lib/whatsapp.ts` | WhatsApp integration helper. |
| `backend/middleware/rateLimiter.ts` | PostgreSQL-backed distributed rate limiting for multi-instance deployments. |
| `backend/validators/productValidator.ts` | Zod schema for product creation. |
| `backend/services/productService.ts` | Prisma queries for filtered listing, slug lookup, search, and creation. |
| `backend/security/index.ts` | Email sanitization, password strength check, secret masking, object sanitization. |
| `backend/actions/index.ts` | Action-record logging to `AdminLog` and background-task queue. |
| `backend/billing/service.ts` | SaaS plan catalog, Stripe Checkout/portal, subscription lifecycle, M-Pesa billing invoices, setup fees, add-ons, and historical commission visibility. |

## 💳 Payment Boundaries

Nurava Tech does not collect shopper payments in merchant-direct mode. The
provider helpers and webhook records remain available for historical
compatibility and separate merchant SaaS billing; new shopper payment
initiation and verification routes fail closed.

### M-Pesa (`backend/payments/mpesa/`)

| Feature | Description |
|---------|-------------|
| `initiateMpesaPayment` | Legacy provider helper; new shopper initiation is disabled at the route boundary. |
| `verifyMpesaPayment` | Legacy provider helper; new shopper verification is disabled at the route boundary. |
| `simulateMpesaPayment` | Sandbox C2B simulate helper. |
| Graceful fallback | "not configured" behavior when `MPESA_*` env vars are absent. |

### Cards (`backend/payments/cards/`)

| Feature | Description |
|---------|-------------|
| `createCardPaymentIntent` | Legacy provider helper; new shopper PaymentIntent creation is disabled at the route boundary. |
| `verifyCardPayment` | Legacy provider helper; new shopper verification is disabled at the route boundary. |
| Graceful fallback | "not configured" behavior when `STRIPE_SECRET_KEY` is absent. |

### Webhooks (`backend/payments/webhooks/`)

| Feature | Description |
|-----------|-------------|
| Stripe signature verification | `stripe.webhooks.constructEvent` validation. |
| M-Pesa STK Push callback | C2B validation/confirmation processing. |
| Order status updates | Updates `Payment` + `Order` status on success/failure/refund. |

### API Routes (`frontend/src/app/api/payments/`)

| Endpoint | Description |
|----------|-------------|
| `POST /api/payments/mpesa/initiate` | Returns a merchant-direct response; no shopper STK Push is initiated. |
| `POST /api/payments/mpesa/verify` | Returns a merchant-direct response; no shopper payment is verified. |
| `POST /api/payments/card/create-intent` | Returns a merchant-direct response; no shopper PaymentIntent is created. |
| `POST /api/payments/card/verify` | Returns a merchant-direct response; no shopper payment is verified. |
| `POST /api/payments/webhooks/stripe` | Stripe webhook (signature verified). |
| `POST /api/payments/webhooks/mpesa/stk-callback` | M-Pesa STK callback. |
| `POST /api/payments/webhooks/mpesa/c2b` | M-Pesa C2B callback. |

### Notifications

| Provider | Features |
|----------|----------|
| **Resend** (`backend/notifications/resend/`) | Real Resend email sending (re-exports from `lib/email.ts`). |
| **SMS** (`backend/notifications/sms/`) | Real Twilio SMS integration with:<br>- Order confirmation SMS<br>- Order status update SMS (CONFIRMED, PROCESSING, SHIPPED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED)<br>- Payment request SMS<br>- Support message SMS<br>- Graceful "not configured" behavior when `TWILIO_*` env vars are absent<br>- Kenyan phone number formatting (+254 prefix) |
| **WhatsApp** (`backend/notifications/whatsapp/`) | Real WhatsApp Cloud API integration with order confirmation, status, payment-request, and support messages. Automated order-status WhatsApp messages are gated by the active paid add-on and the customer's order-update preference. |

## 🗄 Database (Prisma Schema)

Core models:

| Model | Purpose |
|-------|---------|
| `Tenant` / `Store` / `Domain` | Tenant ownership, published store identity, and verified host mapping for separate storefronts |
| `Membership` / `Invitation` | Merchant workspace membership and staff onboarding |
| `MerchantEnquiry` / `MerchantQuote` | Tenant-scoped shopper handoffs, merchant follow-up states, and quote records |
| `User.preferredStoreId` | Authenticated shopper's preferred store for returning-store discovery; not an authorization boundary |
| `User` | Customers & admins (roles: CUSTOMER, ADMIN, SUPERADMIN) |
| `Account` / `Session` / `VerificationToken` | NextAuth OAuth + session support |
| `Category` | Hierarchical product categories (parent/children) |
| `Product` | Products with price, discounted price, stock, specs (JSON), images, warranty, featured/new-arrival flags |
| `Variant` | Product variants (e.g. Color, Storage, RAM) with price modifier & stock |
| `CartItem` | Per-user cart entries with quantity & selected variant |
| `WishlistItem` | Per-user saved products |
| `RecentlyViewed` | Per-user recently viewed products |
| `Order` | Orders with status flow, shipping address (JSON), payment method, totals, tracking number |
| `OrderItem` | Line items per order |
| `Address` | Saved delivery addresses per user |
| `DeliveryRegion` | Delivery cost & ETA by region |
| `Review` | Product reviews with rating (1–5), photos, verified-purchase flag |
| `Coupon` | Discount codes (percent/amount, min order, expiry, usage limit) |
| `Notification` | Per-user notifications (ORDER_STATUS, PROMO, …) |
| `SupportTicket` | Customer support tickets |
| `AdminLog` | Audit trail of admin actions |
| `Plan` / `Subscription` | Configurable SaaS pricing and tenant subscription lifecycle |
| `BillingCustomer` / `BillingRecord` | Provider references and separately tracked setup-fee state |
| `Addon` / `AddonSubscription` | Optional database-managed merchant capabilities |
| `NewsletterSubscription` | Tenant-scoped promotional consent, subscription, and unsubscribe state |
| `StorageAsset` | Tenant/store-scoped product asset byte counts used for storage entitlements |
| `Invoice` / `Payment` | SaaS invoices and provider payments, while retaining shopper order payments |
| `Transaction` | Commission ledger for completed shopper payments |

**Order statuses:** PENDING, CONFIRMED, PROCESSING, SHIPPED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED

**Roles:** CUSTOMER, ADMIN, SUPERADMIN

## 📊 Analytics

| Feature | Description |
|---------|-------------|
| Plan-aware analytics dashboard with: | Basic plan metrics plus advanced reports for eligible plans and platform roles |
| - Revenue, orders, average order value, and conversion rate metrics | |
| - Daily sales and orders charts (7d, 30d, 3m, 1y time ranges) | |
| - Category sales breakdown with percentages | |
| - Top selling products with revenue | |
| - Regional sales distribution | |
| - Payment method breakdown (M-Pesa, Card, COD) | |
| - Advanced reports and CSV/JSON export | Business/Enterprise plans and authorized platform roles |

## 🛡 Security & Infrastructure

| Feature | Description |
|---------|-------------|
| **Rate Limiting** | 60 req/min per IP on sensitive endpoints. |
| **Merchant handoff boundary** | Prevents new platform shopper orders and payments; selected products are handed to the independent merchant for direct completion. |
| **Webhook Deduplication** | Persists webhook receipts so repeated Stripe and M-Pesa callbacks are processed safely. |
| **Audit and Login Events** | Records administrative changes and successful or failed credential-authentication attempts. |
| **Email Sanitization** | Prevents email injection attacks. |
| **Password Strength Check** | Validates password complexity. |
| **Object Sanitization** | Sanitizes incoming objects for security. |
| **Cloudflare R2 Storage** | Upload, delete, signed URL utilities for product images. |
| **Twilio SMS Integration** | Real SMS sending with Kenyan number formatting. |
| **WhatsApp Cloud API** | Real WhatsApp messaging integration. |
| **Resend Email** | Branded order-confirmation email templates. |
| **Prisma Schema** | Complete relational data model with proper relationships. |
| **Seed Data** | Admin user, categories, sample products, coupons. |
| **Payments** | Merchant-direct shopper handoff plus SaaS Stripe Billing, invoice-driven M-Pesa collection, setup fees, add-ons, invoices, and signature-verified webhook lifecycle handling. |
| **Merchant Handoff Flow** | Product selection displays the store's direct WhatsApp/email contact. The merchant confirms availability, price, delivery, payment, refunds, and warranty outside the Nurava Tech shopper payment flow. |
| **Route Protection Middleware** | Admin and protected route guards with role-based access control. |
| **Inventory Service** | Complete inventory management backend with:<br>- Low stock and out-of-stock product detection<br>- Inventory overview with total value and stock counts<br>- Stock alerts (WARNING/CRITICAL severity)<br>- Reorder suggestions based on sales velocity<br>- Stock update endpoints for products and variants<br>- Stock movement history tracking |
| **Recommendation Engine** | API-backed similar-product recommendations render on product-detail pages; the API also supports personalized, trending, featured, new-arrival, and deal queries. |

## 🧪 Testing, CI, and Release Readiness

| Feature | Description |
|---------|-------------|
| **Automated Tests** | Repository test loader covering application and backend behavior, including security, validation, payments, and webhook cases. |
| **Browser Tests** | Playwright E2E coverage for staging or a locally built and started application. |
| **CI Checks** | Ubuntu-based checks for installation, environment validation, database migration deployment, builds, tests, and browser workflows. |
| **Staging Health Check** | Verifies the deployed staging URL and database health before production promotion. |
| **Backup Verification** | Runs PostgreSQL dump and restore checks against disposable backup/restore targets. |
| **Environment Validation** | Validates required staging and production configuration, including secure URLs, authentication, payment, storage, and email settings. |
