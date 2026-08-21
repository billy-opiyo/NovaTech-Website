# Nurava Tech — Features

## 🏠 Public Storefront

| Feature | Description |
|---------|-------------|
| **Platform Homepage** | The platform root is a store-discovery experience with social-proof groups for top-rated, most-reviewed, and new/growing stores. It shows approved review ratings, review volume, product counts, catalogue image previews, and store links. |
| **Merchant Store Homepage** | Each resolved merchant host keeps its own hero, shop-by-category grid, featured products carousel, customer testimonials, newsletter, contact details, and map sections. |
| **Store Directory** | Public `/stores` directory for published stores with featured product context, links to each store host, and an explicit browse-all option for returning shoppers. `Browse Stores` and platform discovery controls stay outside individual merchant navigation. |
| **Store Host Routing** | Local previews support `{store-slug}.localhost`; production links use `{store-slug}.{PLATFORM_DOMAIN}` when DNS and deployment routing are configured. |
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
| **Merchant Handoff Page** | Shows selected products and creates WhatsApp/email enquiry links to the independent store. The merchant confirms price, delivery, payment, refunds, and warranty directly. |

## 👤 Authentication

| Feature | Description |
|---------|-------------|
| **NextAuth v5** | Two providers:<br>- **Google OAuth**<br>- **Credentials** (email + password, verified with `bcrypt`)|
| **JWT Sessions** | Role-based (`CUSTOMER`, `ADMIN`, `SUPERADMIN`) with user ID attached to sessions.|
| **Sign-in/Sign-up Pages** | Form validation and error handling.|
| **Email Verification** | Six-digit verification-code flow after registration, with resend support and expiry handling.|
| **Password Recovery** | Forgot-password email flow and token-based password reset page.|
| **Session Protection** | `getServerSession()` helper used across API routes for protected endpoints.|
| **Account Loading and Route Guards** | Loading states for account screens and middleware protection for authenticated account routes.|

## 🎨 Client Customization and Shared UX

| Feature | Description |
|---------|-------------|
| **Client Configuration and Store Context** | `frontend/src/config/client.config.ts` remains the safe code fallback for branding, contact details, navigation, SEO, homepage content, commerce defaults, social links, and feature flags. Published store settings are resolved through the active `StoreContext`. |
| **Theme Presets** | Reusable visual systems in `frontend/src/config/theme-presets.ts`, selected through `themePreset` without recoding individual pages. |
| **Profile Images** | Account settings support JPG, PNG, WEBP, and GIF uploads up to 5 MB, with generated profile storage keys and R2-backed storage. |
| **Branded Splash and Loading UI** | Responsive gradient wordmark, animated splash progress, and accessible loading status messaging on the platform homepage and protected platform control plane only; merchant storefront and admin routes open without the splash. |
| **Shared Notifications** | Toast notifications with success, error, and informational states, dismissal controls, and `aria-live` announcements. |
| **Responsive Navigation** | Merchant storefronts provide desktop/mobile search, cart, account, notification, and floating actions. The platform homepage provides `Home`, `Browse Stores`, and `Start a Store` links plus theme control, while its footer provides merchant support links and merchant storefronts provide shopper service links plus a `Nurava Tech Homepage` return link. |

## 👑 Admin Panel

| Feature | Description |
|---------|-------------|
| **Admin Layout** | Collapsible sidebar (desktop) + slide-in mobile sidebar with sections: Dashboard, Analytics, Products, Orders, Customers, Reviews, Deliveries, Support Tickets, Messages, Settings, Security, Activity Log.|
| **Top Bar** | Search and notifications badge.|
| **Admin Products Page** | Full CRUD-style UI with:<br>- Stats cards (total products, active, out of stock, drafts)<br>- Search, status filters (active/draft/out-of-stock/archived), sorting<br>- Bulk selection, table rows with product details, stock levels, sales, ratings<br>- Delete confirmation modal.|
| **Admin Orders Page** | Order management table with status tracking.|
| **Admin Analytics** | Growth comparison calculations (period-over-period), CSV/JSON export functionality, real-time growth data in metric cards.|
| **Admin Customers Page** | Customer listing with filters and details.|
| **Admin Reviews Page** | Reviews moderation with filters and status updates.|
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
| **Merchant billing dashboard** | `/manage/billing` shows the active plan, lifecycle state, setup-fee status, add-ons, invoices, SaaS payment history, renewal, cancellation, upgrade, downgrade, and payment-method actions. |
| **M-Pesa SaaS collection** | At launch, setup fees and the first subscription are combined after the trial; later renewals create local invoices and Daraja STK requests. Callbacks confirm or fail the invoice/payment and update subscription state. This is invoice-driven rather than an automatic recurring charge. |
| **Future provider support** | Stripe provider helpers and historical webhook synchronization remain available behind the billing-provider boundary but are not presented as an active launch payment method. |
| **Add-ons** | Admin-managed add-ons can be subscribed/unsubscribed by merchant owners/admins; Stripe recurring items are supported when an add-on Stripe price ID is configured, otherwise M-Pesa charges are included in the next invoice. |
| **Transaction commissions** | New shopper transaction commissions are disabled because each independent merchant completes its own sale. Existing historical records remain visible for reconciliation. |
| **Platform billing control plane** | `/platform/billing` provides platform-role-protected plan/add-on management, subscription/customer visibility, paid invoice revenue, legacy commission visibility, invoices, and failed SaaS payments. |
| **Platform operations control plane** | `/platform/operations` provides Super Admin and platform-role-protected cross-store metrics, tenant/store search and filtering, product/order/support counts, subscription/setup-fee status, recent activity and invoices, storefront preview links, and authorized suspension/reactivation controls. |

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
| `/api/newsletter` | POST | Validates email and acknowledges subscription. |
| `/api/products/upload` | POST | Admin product image upload to Cloudflare R2 (images only, 5MB max). |
| `/api/auth/[...nextauth]` | GET, POST | NextAuth handlers. |
| `/api/billing/plans` | GET | Lists active database-backed SaaS plans and add-ons. |
| `/api/manage/billing` | GET, POST | Tenant-scoped merchant billing reads and owner/admin billing actions. |
| `/api/platform/billing` | GET, POST | Platform-role-protected plan/add-on management and billing reporting. |
| `/api/platform/operations` | GET, PATCH | Cross-store platform metrics, tenant activity, store previews, billing summaries, and authorized store status controls. |

## 🔐 Backend Services & Utilities

| Service / Utility | Description |
|-------------------|-------------|
| `backend/lib/db.ts` | Prisma client singleton for dev hot-reload safety. |
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
| **WhatsApp** (`backend/notifications/whatsapp/`) | Real WhatsApp Cloud API integration with:<br>- Order confirmation messages<br>- Order status updates<br>- Payment requests<br>- Support messages<br>- Wired into `order.service.ts` for automated order status notifications |

## 🗄 Database (Prisma Schema)

Core models:

| Model | Purpose |
|-------|---------|
| `Tenant` / `Store` / `Domain` | Tenant ownership, published store identity, and verified host mapping for separate storefronts |
| `Membership` / `Invitation` | Merchant workspace membership and staff onboarding |
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
| `Invoice` / `Payment` | SaaS invoices and provider payments, while retaining shopper order payments |
| `Transaction` | Commission ledger for completed shopper payments |

**Order statuses:** PENDING, CONFIRMED, PROCESSING, SHIPPED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED

**Roles:** CUSTOMER, ADMIN, SUPERADMIN

## 📊 Analytics

| Feature | Description |
|---------|-------------|
| Real-time analytics dashboard with: | |
| - Revenue, orders, average order value, and conversion rate metrics | |
| - Daily sales and orders charts (7d, 30d, 3m, 1y time ranges) | |
| - Category sales breakdown with percentages | |
| - Top selling products with revenue | |
| - Regional sales distribution | |
| - Payment method breakdown (M-Pesa, Card, COD) | |

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
