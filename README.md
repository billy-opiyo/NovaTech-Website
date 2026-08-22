# Nurava Tech — Electronics E-Commerce Platform (Kenya)

A hosted multi-store electronics commerce platform for the Kenyan market. Shoppers can discover approved published stores at `/stores`, while merchants create and operate stores, manage SaaS subscriptions, and pay through invoice-driven M-Pesa flows at launch. Stripe remains provider-ready for a future rollout.

The project is a **monorepo** managed with **npm workspaces**, containing a Next.js 15 frontend and a Prisma/PostgreSQL backend.

Detailed documentation is available in [`docs/README.md`](docs/README.md), with the complete feature inventory in [`docs/features.md`](docs/features.md) and client setup guidance in [`docs/client-customization.md`](docs/client-customization.md).

---

## 📋 Table of Contents

1. [Tech Stack](#-tech-stack)
2. [Implemented Features](#-implemented-features)
3. [Project Structure](#-project-structure)
4. [Database Schema](#-database-schema)
5. [API Endpoints](#-api-endpoints)
6. [Environment Variables](#-environment-variables)
7. [Getting Started](#-getting-started)
8. [Available Scripts](#-available-scripts)
9. [Implementation Status](#-implementation-status)

---

## 🛠 Tech Stack

| Layer             | Technology                                                                     |
| ----------------- | ------------------------------------------------------------------------------ |
| **Frontend**      | Next.js 15 (App Router), React 19, TypeScript                                  |
| **Styling**       | Tailwind CSS 3, Framer Motion (animations), lucide-react / react-icons (icons) |
| **Backend**       | Prisma ORM 6.19.3, PostgreSQL (Neon), Zod (validation), bcrypt                 |
| **Auth**          | NextAuth v5 (beta) — Google OAuth + Credentials, JWT sessions                  |
| **Email**         | Resend                                                                         |
| **Storage**       | Cloudflare R2 (AWS SDK v3)                                                     |
| **SaaS Billing**  | Database-backed plans, Stripe Billing, M-Pesa invoice collection, add-ons     |
| **Rate Limiting** | PostgreSQL-backed distributed buckets (60 req/min per IP)                     |
| **Monorepo**      | npm workspaces (`frontend` + `backend`)                                        |

---

## ✨ Implemented Features

### 🏠 Public Storefront

| Feature              | Description                                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Home Pages**       | The platform root is a social-proof store discovery homepage; each merchant host keeps its own hero, shop-by-category grid, featured products, customer testimonials, newsletter, and contact sections. |
| **Products Catalog** | Full product listing with brand filters, price range, in-stock/on-sale toggles, category filtering, sorting (newest, price, rating), search, and pagination.                                |
| **Product Detail**   | Image gallery with zoom, product variants, pricing, stock status, merchant warranty information, reviews section, and direct merchant enquiry handoff. |
| **Category Pages**   | Dedicated category landing pages (Phones, Laptops, Tablets, Accessories) with subcategories.                                                                                                |
| **Deals Page**       | Promotional deal cards linking into filtered product listings.                                                                                                                              |
| **Compare Page**     | Side-by-side product comparison with spec tables and highlight win/loss indicators.                                                                                                         |
| **Search Overlay**   | Responsive global search with `Ctrl+K`, popular searches, live product suggestions, keyboard-friendly navigation, and mobile positioning.                                                   |
| **Theme System**     | Client-configured light/dark presets backed by CSS variables, with localStorage persistence and flash-free initialization.                                                                   |
| **Responsive UI**    | Responsive header, mobile navigation, footer, homepage sections, product details, and search overlay with accessibility refinements.                                                        |
| **Public Pages**     | About, Blog, Contact, FAQs, Warranty, Return Policy, Privacy Policy, Cookie Policy, and Terms and Conditions.                                                                               |
| **Store Directory**  | Public `/stores` discovery page linking shoppers to separate independent store hosts; each store keeps its own catalog and merchant contact flow. |

### 🛒 Product Selection & Merchant Handoff

- **Cart Context (`CartProvider`)** — client-side cart state persisted to `localStorage`:
  - Add / remove / update quantity items
  - Variant-aware item merging
  - Max-stock clamping
  - **Save for later** / **Move to cart**
  - Subtotal, shipping estimate (free shipping over KES 50,000), and total calculations
- **Cart Page** — optional product selection list with quantity controls and save-for-later support.
- **Merchant Handoff Page** — collects consented shopper contact details, saves a tenant-scoped enquiry with server-authoritative product snapshots, then sends the selected products to the independent store through WhatsApp or email. The merchant confirms availability, delivery, payment, refunds, taxes, and warranty directly.
- **Merchant Enquiries and Quotes** — `/manage/enquiries` provides status tracking, internal notes, enquiry history, and owner/admin quote creation with email delivery.
- **Catalog Import/Export** — `/manage/catalog` provides CSV templates, preview validation, SKU-based create/update imports, entitlement checks, partial success reporting, audit records, and current catalog export.
- **Platform boundary** — Nurava Tech does not create new shopper orders or collect shopper payments in `MERCHANT_DIRECT` mode.

### 👤 Authentication

- **NextAuth v5** with two providers:
  - **Google OAuth**
  - **Credentials** (email + password, verified with `bcrypt`)
- JWT session strategy with role (`CUSTOMER`, `ADMIN`, `SUPERADMIN`) and user ID attached to sessions.
- Sign-in and Sign-up pages with form validation and error handling.
- Email verification with six-digit codes and resend support.
- Secure merchant invitation acceptance at `/auth/accept-invitation` with hashed expiring tokens, invited-email matching, membership activation, and email/manual link delivery.
- Forgot-password email flow and token-based password reset.
- `getServerSession()` helper used across API routes for protected endpoints.
- Account loading states and middleware protection for authenticated account routes.

### 🎨 Client Customization and Shared UX

- Shared homepage layout with active-store branding and homepage content resolved through `StoreContext`; `client.config.ts` remains the safe developer fallback.
- Authenticated preferred-store persistence through `User.preferredStoreId`, with a legacy preferred-store cookie fallback for returning browsers.
- Reusable theme presets in `frontend/src/config/theme-presets.ts`.
- Account profile image uploads for JPG, PNG, WEBP, and GIF files up to 5 MB, with generated storage keys and R2-backed storage.
- Branded responsive splash screen, route loading UI, shared toast notifications, responsive footer grid, actionable contact links, and shared theme/search/cart/account controls.

### 👑 Admin Panel

- Dedicated admin layout with:
  - Collapsible sidebar (desktop) + slide-in mobile sidebar
  - Sections: Dashboard, Analytics, Products, Orders, Customers, Reviews, Deliveries, Support Tickets, Messages, Settings, Security, Activity Log
  - Top bar with search and notifications badge
- **Admin Products page** — full CRUD-style UI with:
  - Stats cards (total products, active, out of stock, drafts)
  - Search, status filters (active/draft/out-of-stock/archived), sorting
  - Bulk selection, table rows with product details, stock levels, sales, ratings
  - Delete confirmation modal
- **Admin Orders page** — order management table.

### 💼 SaaS Billing

- Database-backed `Starter`, `Business`, and `Enterprise` plans with configurable prices, intervals, entitlements, and setup fees for merchant platform services.
- Merchant billing at `/manage/billing`: subscription status, setup-fee state, M-Pesa post-trial activation and renewal collection, scheduled plan changes, add-ons, invoices, and SaaS payment history. Stripe remains provider-ready but is not shown at launch.
- Platform billing at `/platform/billing`: plan management, add-on visibility, subscription counts, paid invoice revenue, legacy commission visibility, customer billing records, and failed SaaS payments.
- Super Admin operations at `/platform/operations`: cross-store metrics, merchant store directory, product/order/support counts, subscription and setup-fee status, recent activity, invoice visibility, storefront preview links, and authorized suspend/reactivate controls.
- M-Pesa setup/first-subscription and renewal events are invoice-driven because Daraja collection is initiated per payment request. Historical Stripe webhook support remains available behind the future-provider boundary.
- Merchant verification is required before publication or selling. `/manage/verification` submits a review request, while authorized platform operators review status in `/platform/operations`; sensitive identity, tax, contact, location, and settlement evidence is encrypted or stored in the private verification workflow.
- Merchant onboarding and first publication require an explicit, versioned acknowledgement of the current merchant terms, privacy notice, and merchant responsibilities. Acceptance records are included in merchant exports and preserved separately from workspace-retention deletion.
- Plan limits are server-enforced for products, staff accounts, and custom domains; additions are blocked when the entitlement is unavailable or full.
- `npm --workspace backend run worker:lifecycle` runs the credential-free lifecycle worker source: subscription expiry/grace transitions and due retention processing. It is not automatic until a scheduler is configured, and it will not process due private evidence without the configured private bucket.
- Historical shopper order/payment records remain separate from merchant SaaS billing; new shopper payments and transaction commission creation are disabled by the merchant-direct model.

### 📦 Backend API (App Router Route Handlers)

| Endpoint                  | Methods                | Description                                                                                                                                                         |
| ------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/products`           | GET, POST              | Filtered product listing (search, category, brand, price, stock, sale, featured, new arrivals, sort, paginate) and admin-only product creation with Zod validation. |
| `/api/reviews`            | GET, POST, PUT, DELETE | Paginated review listing per product, create review (verified-purchase detection), update own reviews, delete own or admin reviews.                                 |
| `/api/wishlist`           | GET, POST, DELETE      | Read / add / remove wishlist items for authenticated users.                                                                                                         |
| `/api/orders`             | GET, POST              | List historical authenticated-user orders; new shopper order creation is disabled in merchant-direct mode.                                                          |
| `/api/orders/[id]`        | GET, PATCH             | Fetch single order (owner or admin), admin updates order status / tracking number with user notification.                                                           |
| `/api/coupons/validate`   | POST                   | Real coupon validation against DB (expiry, usage limit, active flag, min order value) and discount calculation.                                                     |
| `/api/contact`            | POST                   | Creates a support ticket and sends email via Resend (support team + customer confirmation).                                                                         |
| `/api/enquiries`          | POST                   | Rate-limited merchant-direct enquiry creation with host-derived tenant scope and server-authoritative product snapshots.                                            |
| `/api/invitations/accept` | GET, POST              | Previews and atomically accepts an expiring invitation for the authenticated invited email.                                                                         |
| `/api/manage/enquiries`   | GET, PATCH              | Tenant-scoped enquiry search, status, notes, tags, and assignment updates.                                                                                         |
| `/api/manage/enquiries/{id}/quote` | POST              | Owner/admin quote creation and email delivery for a merchant enquiry.                                                                                              |
| `/api/manage/catalog/import` | POST                | CSV preview or partial commit with validation, SKU matching, entitlement checks, and audit reporting.                                                             |
| `/api/manage/catalog/export` | GET                  | Tenant-scoped CSV catalog export for authorized merchant staff.                                                                                                    |
| `/api/newsletter`         | POST                   | Validates email and acknowledges subscription.                                                                                                                      |
| `/api/products/upload`    | POST                   | Admin product image upload to Cloudflare R2 (images only, 5MB max).                                                                                                 |
| `/api/auth/[...nextauth]` | GET, POST              | NextAuth handlers.                                                                                                                                                  |
| `/api/billing/plans`      | GET                    | Lists active database-backed SaaS plans and add-ons for onboarding/catalog UI.                                                                                       |
| `/api/manage/billing`     | GET, POST              | Tenant-scoped billing dashboard data and owner/admin subscription, add-on, setup-fee, renewal, cancellation, portal, and payment actions.                           |
| `/api/platform/billing`   | GET, POST              | Platform-role-protected plan/add-on administration, customer billing records, revenue, commissions, invoices, and failed-payment reporting.                       |
| `/api/platform/operations` | GET, PATCH             | Platform-role-protected cross-store metrics, tenant activity, store previews, billing summaries, and authorized store suspension/reactivation.                    |

### 🔐 Backend Services & Utilities

- **`backend/lib/db.ts`** — Prisma client singleton for dev hot-reload safety.
- **`backend/lib/email.ts`** — Resend email sending with branded order-confirmation template.
- **`backend/lib/storage.ts`** — Cloudflare R2 upload/delete/signed-URL generation.
- **`backend/lib/whatsapp.ts`** — WhatsApp integration helper.
- **`backend/middleware/rateLimiter.ts`** — PostgreSQL-backed distributed rate limiting (60 requests / minute per IP).
- **`backend/validators/productValidator.ts`** — Zod schema for product creation.
- **`backend/services/productService.ts`** — Prisma queries for filtered listing, slug lookup, search, and creation.
- **`backend/security/index.ts`** — Email sanitization, password strength check, secret masking, object sanitization.
- **`backend/actions/index.ts`** — Action-record logging to `AdminLog` and background-task queue.

### 💳 Payments (Real Provider Integration)

- **M-Pesa** (`backend/payments/mpesa/`) — Provider helpers and historical webhook support remain available, while new shopper initiation/verification endpoints fail closed in merchant-direct mode:
  - `initiateMpesaPayment` — STK Push request, stores `Payment` row (PENDING).
  - `verifyMpesaPayment` — STK Push query, maps `ResultCode` → status, confirms order.
  - `simulateMpesaPayment` — Sandbox C2B simulate helper.
  - Graceful "not configured" behavior when `MPESA_*` env vars are absent.
- **Cards** (`backend/payments/cards/`) — Provider helpers and historical webhook support remain available, while new shopper initiation/verification endpoints fail closed; SaaS subscriptions use the M-Pesa launch path and retain future-provider compatibility:
  - `createCardPaymentIntent` — Creates PaymentIntent (KES), returns `clientSecret`, stores `Payment` row.
  - `verifyCardPayment` — Retrieves PaymentIntent, maps status, confirms order.
  - Graceful "not configured" behavior when `STRIPE_SECRET_KEY` is absent.
- **Webhooks** (`backend/payments/webhooks/`) — Provider-verified handlers:
  - Stripe signature verification (`stripe.webhooks.constructEvent`).
  - M-Pesa STK Push callback + C2B validation/confirmation processing.
  - Updates `Payment` + `Order` status on success/failure/refund and synchronizes SaaS subscription/invoice lifecycle events.
- **SaaS billing** (`backend/billing/service.ts`) — Server-side plan catalog, M-Pesa invoice collection, post-trial setup-fee tracking, next-renewal plan changes, add-ons, and legacy commission snapshots.
- **API Routes** (`frontend/src/app/api/payments/`):
  - `POST /api/payments/mpesa/initiate` — Initiate STK Push.
  - `POST /api/payments/mpesa/verify` — Verify STK Push status.
  - `POST /api/payments/card/create-intent` — Create Stripe PaymentIntent.
  - `POST /api/payments/card/verify` — Verify PaymentIntent status.
  - `POST /api/payments/webhooks/stripe` — Stripe webhook (signature verified).
  - `POST /api/payments/webhooks/mpesa/stk-callback` — M-Pesa STK callback.
  - `POST /api/payments/webhooks/mpesa/c2b` — M-Pesa C2B callback.
- **Resend** (`backend/notifications/resend/`) — Real Resend email sending (re-exports from `lib/email.ts`).
- **SMS** (`backend/notifications/sms/`) — Real Twilio SMS integration with order confirmation, status updates, payment requests, and support messages.
- **WhatsApp** (`backend/notifications/whatsapp/`) — Real WhatsApp Cloud API integration with order confirmation, status updates, payment requests, and support messages. Wired into `order.service.ts` for automated order status notifications.

### 🗄 Database (Prisma Schema)

Core models: `User`, `Account`, `Session`, `VerificationToken`, `Tenant`, `Store`, `Domain`, `Membership`, `Invitation`, `MerchantEnquiry`, `MerchantQuote`, `Plan`, `Subscription`, `BillingCustomer`, `BillingRecord`, `Addon`, `AddonSubscription`, `Invoice`, `Payment`, `Transaction`, `Category`, `Product`, `Variant`, `CartItem`, `WishlistItem`, `RecentlyViewed`, `Order`, `OrderItem`, `Address`, `DeliveryRegion`, `Review`, `Coupon`, `Notification`, `SupportTicket`, `AdminLog`.

Roles: `CUSTOMER`, `ADMIN`, `SUPERADMIN`. Order statuses: `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`.

---

## 📁 Project Structure

```
NovaTech Website/
├── package.json                  # Root monorepo + workspace config & scripts
├── tsconfig.json                 # Root TypeScript config
├── .env.example                  # Example environment variables
├── frontend/                     # Next.js 15 frontend
│   ├── middleware.ts             # Next.js middleware (route protection)
│   ├── next.config.ts
│   ├── tailwind.config.ts        # Tailwind theme (primary/accent/dark colors)
│   ├── postcss.config.js
│   └── src/
│       ├── app/
│       │   ├── layout.tsx        # Root layout (ThemeProvider, CartProvider, Header/Footer)
│       │   ├── page.tsx          # Home page
│       │   ├── loading.tsx        # Accessible route loading state
│       │   ├── not-found.tsx      # Branded not-found page
│       │   ├── account/           # Account pages (orders, wishlist, settings)
│       │   ├── admin/             # Admin panel
│       │   │   ├── layout.tsx    # Sidebar + top bar layout
│       │   │   ├── dashboard/    # Admin dashboard
│       │   │   ├── products/     # Product management table
│       │   │   ├── orders/       # Order management table
│       │   │   ├── analytics/    # Analytics page
│       │   │   ├── customers/    # Customers page
│       │   │   ├── reviews/      # Reviews moderation
│       │   │   ├── coupons/      # Coupon management
│       │   │   └── inventory/    # Stock management
│       │   ├── api/              # App Router API route handlers
│       │   │   ├── auth/         # NextAuth [...nextauth]
│       │   │   ├── products/     # Product listing & creation
│       │   │   ├── reviews/      # Review CRUD
│       │   │   ├── wishlist/     # Wishlist CRUD
│       │   │   ├── orders/       # Order list/create + [id] get/update
│       │   │   ├── coupons/validate/  # Coupon validation
│       │   │   ├── contact/      # Support ticket creation
│       │   │   └── newsletter/   # Newsletter subscription
│       │   ├── auth/             # Sign-in, sign-up, verification, password reset
│       │   ├── cart/             # Cart page
│       │   ├── category/[slug]/  # Dynamic category pages
│       │   ├── checkout/         # Checkout page
│       │   ├── compare/          # Compare page
│       │   ├── contact/          # Contact page
│       │   ├── about/             # About page
│       │   ├── blog/              # Blog page
│       │   ├── faqs/              # FAQ page
│       │   ├── warranty/          # Warranty page
│       │   ├── return-policy/     # Return policy page
│       │   ├── privacy-policy/    # Privacy policy page
│       │   ├── cookie-policy/     # Cookie policy page
│       │   ├── terms/             # Terms and conditions page
│       │   ├── deals/            # Deals page
│       │   └── products/         # Product listing + [slug] detail
│       ├── components/
│       │   ├── layout/           # Header, Footer, MobileNav, FloatingActions
│       │   ├── providers/        # ThemeProvider
│       │   ├── search/           # SearchOverlay
│       │   ├── product/          # Recommendations, StickyAddToCart
│       │   ├── notifications/    # NotificationCenter
│       │   └── ui/               # ErrorBoundary, Skeletons
│       ├── lib/
│       │   ├── auth.ts           # NextAuth config (Google + Credentials)
│       │   └── cartContext.tsx   # Cart state management (localStorage)
│       └── constants/ hooks/ services/ store/ styles/ types/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Full DB schema
│   │   └── seed.ts              # Seed admin user, categories, products, coupons
│   ├── lib/
│   │   ├── db.ts                # Prisma client singleton
│   │   ├── email.ts             # Resend email + order confirmation template
│   │   ├── storage.ts           # Cloudflare R2 file operations
│   │   └── whatsapp.ts          # WhatsApp helper
│   ├── middleware/
│   │   └── rateLimiter.ts       # PostgreSQL-backed IP rate limiting (60 req/min)
│   ├── controllers/
│   │   └── productController.ts # Product GET/POST/search handlers
│   ├── services/
│   │   ├── order.service.ts     # Order business logic
│   │   ├── support.service.ts   # Support ticket management with email notifications
│   │   ├── inventory.service.ts # Stock management
│   │   ├── productService.ts    # Product queries (filter, by slug, search, create)
│   │   └── analytics.service.ts # Analytics queries
│   ├── validators/
│   │   └── productValidator.ts  # Zod product schema
│   ├── payments/
│   │   ├── mpesa/               # M-Pesa Daraja STK Push integration
│   │   ├── cards/               # Stripe Payment Intents integration
│   │   └── webhooks/            # Stripe + M-Pesa webhook handlers
│   ├── notifications/
│   │   ├── resend/              # Real Resend email sending
│   │   ├── sms/                 # Real Twilio SMS integration
│   │   └── whatsapp/            # Real WhatsApp Cloud API integration
│   ├── security/                # Sanitization utilities
│   ├── actions/                 # AdminLog audit + background task queue
│   └── types/                   # Shared types
└── tests/                        # Test directory
```

---

## 🗄 Database Schema Overview

| Model                                       | Purpose                                                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `Tenant` / `Store` / `Domain`               | Tenant ownership, store identity, publication status, and host mapping                                  |
| `Membership` / `Invitation`                 | Merchant workspace membership and staff onboarding                                                       |
| `MerchantEnquiry` / `MerchantQuote`         | Tenant-scoped shopper handoffs, merchant follow-up states, and quote records                           |
| `User`                                      | Customers & admins (roles: CUSTOMER, ADMIN, SUPERADMIN)                                                  |
| `User.preferredStoreId`                     | Preferred shopper store; discovery convenience only, not an authorization boundary                    |
| `Account` / `Session` / `VerificationToken` | NextAuth OAuth + session support                                                                         |
| `Category`                                  | Hierarchical product categories (parent/children)                                                        |
| `Product`                                   | Products with price, discounted price, stock, specs (JSON), images, warranty, featured/new-arrival flags |
| `Variant`                                   | Product variants (e.g. Color, Storage, RAM) with price modifier & stock                                  |
| `CartItem`                                  | Per-user cart entries with quantity & selected variant                                                   |
| `WishlistItem`                              | Per-user saved products                                                                                  |
| `RecentlyViewed`                            | Per-user recently viewed products                                                                        |
| `Order`                                     | Orders with status flow, shipping address (JSON), payment method, totals, tracking number                |
| `OrderItem`                                 | Line items per order                                                                                     |
| `Address`                                   | Saved delivery addresses per user                                                                        |
| `DeliveryRegion`                            | Delivery cost & ETA by region                                                                            |
| `Review`                                    | Product reviews with rating (1–5), photos, verified-purchase flag                                        |
| `Coupon`                                    | Discount codes (percent/amount, min order, expiry, usage limit)                                          |
| `Notification`                              | Per-user notifications (ORDER_STATUS, PROMO, …)                                                          |
| `SupportTicket`                             | Customer support tickets                                                                                 |
| `AdminLog`                                  | Audit trail of admin actions                                                                             |
| `Plan` / `Subscription`                     | Configurable SaaS pricing and tenant subscription lifecycle                                              |
| `BillingCustomer` / `BillingRecord`         | Provider customer references and separately tracked onboarding/setup-fee status                         |
| `Addon` / `AddonSubscription`               | Database-managed optional merchant capabilities and tenant subscriptions                                |
| `Invoice` / `Payment`                       | SaaS invoices and provider payments; shopper order payments remain supported by nullable billing links  |
| `Transaction`                               | Completed shopper payment commission with a plan-rate snapshot                                           |

---

## 🌍 Environment Variables

| Variable                             | Description                                            |
| ------------------------------------ | ------------------------------------------------------ |
| `DATABASE_URL`                       | PostgreSQL connection string (Neon pooled recommended) |
| `AUTH_SECRET`                        | NextAuth.js secret                                     |
| `AUTH_GOOGLE_ID`                     | Google OAuth client ID                                 |
| `AUTH_GOOGLE_SECRET`                 | Google OAuth client secret                             |
| `R2_ACCOUNT_ID`                      | Cloudflare R2 account ID                               |
| `R2_ACCESS_KEY_ID`                   | Cloudflare R2 access key                               |
| `R2_SECRET_ACCESS_KEY`               | Cloudflare R2 secret key                               |
| `R2_BUCKET_NAME`                     | Cloudflare R2 bucket name                              |
| `R2_PRIVATE_BUCKET_NAME`             | Separate private R2 bucket for merchant verification evidence |
| `NEXT_PUBLIC_R2_PUBLIC_URL`          | Public base URL for R2-hosted files                    |
| `MERCHANT_VERIFICATION_ENCRYPTION_KEY` | 32-byte hex/base64 key for encrypted merchant verification details |
| `RESEND_API_KEY`                     | Resend email API key                                   |
| `WHATSAPP_TOKEN`                     | WhatsApp Cloud API token                               |
| `WHATSAPP_PHONE_NUMBER_ID`           | WhatsApp Cloud API phone number ID                     |
| `NEXT_PUBLIC_APP_URL`                | Public app URL (e.g. `http://localhost:3000`)          |
| `CRON_SECRET`                        | Secret used to authenticate the protected Vercel lifecycle Cron route |
| `PLATFORM_DOMAIN`                    | Production platform domain for tenant subdomains       |
| `MPESA_CONSUMER_KEY`                 | M-Pesa Daraja consumer key                             |
| `MPESA_CONSUMER_SECRET`              | M-Pesa Daraja consumer secret                          |
| `MPESA_PASSKEY`                      | M-Pesa Daraja passkey (STK Push)                       |
| `MPESA_SHORTCODE`                    | M-Pesa business shortcode (e.g. `174379`)              |
| `MPESA_ENV`                          | M-Pesa environment: `sandbox` or `production`          |
| `STRIPE_SECRET_KEY`                  | Stripe secret key                                      |
| `STRIPE_WEBHOOK_SECRET`              | Stripe webhook signing secret                          |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (frontend)                      |
| `SEED_ADMIN_PASSWORD`                | Required only for development database seeding         |
| `INITIAL_ADMIN_EMAIL`                | Production admin initialization email                  |
| `INITIAL_ADMIN_PASSWORD`             | Production admin initialization password               |
| `STAGING_URL`                        | Deployed staging URL for health checks                 |
| `BACKUP_DATABASE_URL`                 | Source database URL for backup verification             |
| `RESTORE_DATABASE_URL`                | Disposable restore target for backup verification      |
| `E2E_PAYMENT_PROVIDER`                | Payment provider used by sandbox browser tests          |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (Next.js 15 requirement)
- PostgreSQL database (or a Neon connection string)
- npm 9+

### 1. Install dependencies

```bash
npm install
```

This installs all workspace dependencies (`frontend` + `backend`).

### 2. Configure environment

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

### 3. Set up the database

```bash
npm run db:push        # Push Prisma schema to database
npm run db:seed        # Seed admin user, categories, products
```

The seed creates a **SUPERADMIN** account:

```
Email:    support@nuravatech.com
Password: admin123
```

### 4. Start the development server

```bash
npm run dev            # Runs the Next.js frontend on http://localhost:3000
```

Or open the browser automatically:

```bash
npm run dev:open
```

---

## 📜 Available Scripts

### Root (`package.json`)

| Script       | Command                                                           | Description                      |
| ------------ | ----------------------------------------------------------------- | -------------------------------- |
| `dev`        | `npm --workspace frontend run dev`                                | Start Next.js dev server         |
| `dev:open`   | `start http://localhost:3000 && npm --workspace frontend run dev` | Dev server + open browser        |
| `build`      | `npm --workspace frontend run build`                              | Production build                 |
| `start`      | `npm --workspace frontend run start`                              | Start production server          |
| `db:migrate` | `npm --workspace backend run db:migrate`                          | Run Prisma migrations            |
| `db:deploy`  | `npm --workspace backend run db:deploy`                           | Deploy committed Prisma migrations |
| `db:push`    | `npm --workspace backend run db:push`                             | Push schema (no migration files) |
| `db:seed`    | `npm --workspace backend run db:seed`                             | Seed database                    |
| `test`       | `node --test --test-concurrency=1 --require ./tests/register.cjs tests/**/*.test.ts` | Run the repository test suite |
| `check:env`  | `node scripts/check-env.mjs`                                      | Validate environment variables |
| `test:e2e`   | `playwright test`                                                  | Run Playwright browser tests    |
| `check:staging` | `node scripts/check-staging.mjs`                               | Check deployed staging health   |
| `check:backup` | `node scripts/verify-backup.mjs`                                | Verify PostgreSQL backup restore |

### Frontend (`frontend/package.json`)

| Script  | Description  |
| ------- | ------------ |
| `dev`   | `next dev`   |
| `build` | `next build` |
| `start` | `next start` |

### Backend (`backend/package.json`)

| Script        | Description                |
| ------------- | -------------------------- |
| `build`       | `tsc` (TypeScript compile) |
| `db:generate` | `prisma generate`          |
| `db:migrate`  | `prisma migrate dev`       |
| `db:push`     | `prisma db push`           |
| `db:seed`     | Runs `prisma/seed.ts`      |

---

## ✅ Implementation Status

### Fully Implemented

- ✔️ **Frontend storefront** — Home, Products (filtering/sorting/search/pagination UI), Product Detail, product selection, merchant handoff, Deals, Compare, Category, Contact, Wishlist
- ✔️ **Shopping cart** — Client-side state with `localStorage` persistence, save-for-later, quantity & stock management, shipping/total calculation
- ✔️ **Authentication** — NextAuth v5 with Google OAuth + Credentials (bcrypt), JWT sessions, role-based access
- ✔️ **Admin panel UI** — Layout, sidebar navigation, Dashboard, Analytics, Products management, Orders management, Customers, Reviews, Coupons, Inventory, Deliveries, Support Tickets, Messages, Settings, Security, Activity Log
- ✔️ **Dark/light theme** — Configurable theme presets with CSS variables, localStorage persistence, and flash-free initialization
- ✔️ **Global search** — Responsive search overlay with keyboard shortcut, live suggestions, and mobile positioning
- ✔️ **Responsive and accessible UI** — Responsive shared layouts, improved focus/labels, semantic status messaging, and live toast notifications
- ✔️ **Account enhancements** — Account loading states, corrected middleware guards, saved theme preferences, and profile image uploads up to 5 MB
- ✔️ **Authentication flows** — Email verification with resend support and token-based password reset
- ✔️ **Public information pages** — About, Blog, FAQs, Warranty, Return Policy, Privacy Policy, Cookie Policy, and Terms and Conditions
- ✔️ **Client customization** — Centralized branding, content, SEO, commerce defaults, feature flags, and theme selection
- ✔️ **Shopper store discovery** — The platform homepage and `/stores` list eligible published stores with approved review ratings, review volume, product counts, catalogue image previews, and direct links to host-resolved individual storefronts
- ✔️ **Shared merchant homepage content** — Merchant-specific hero, categories, featured products, testimonials, newsletter, contact, and map sections are rendered only on the resolved store host; platform-home action controls remain separate
- ✔️ **Preferred store continuity** — Authenticated `User.preferredStoreId` persistence plus the legacy preferred-store browser fallback
- ✔️ **Product API** — Filtering, pagination, search, creation (admin-protected, Zod validated)
- ✔️ **Order API** — Historical order listing/status support; new shopper order creation is disabled in merchant-direct mode
- ✔️ **Review API** — Full CRUD with verified-purchase detection and role-aware deletion
- ✔️ **Wishlist API** — Full CRUD for authenticated users
- ✔️ **Coupon API** — Real DB-backed validation (expiry, usage limit, min order, discount)
- ✔️ **Contact API** — Support ticket creation + email notification
- ✔️ **Newsletter API** — Validated subscription endpoint
- ✔️ **Analytics API** — Real-time analytics dashboard with:
  - Revenue, orders, average order value, and conversion rate metrics
  - Daily sales and orders charts (7d, 30d, 3m, 1y time ranges)
  - Category sales breakdown with percentages
  - Top selling products with revenue
  - Regional sales distribution
  - Payment method breakdown (M-Pesa, Card, COD)
- ✔️ **Rate limiting** — PostgreSQL-backed distributed buckets with a 60 req/min per-IP limit on sensitive endpoints
- ✔️ **Email** — Resend integration with branded order-confirmation template
- ✔️ **SMS notifications** — Real Twilio SMS integration with:
  - Order confirmation SMS
  - Order status update SMS (CONFIRMED, PROCESSING, SHIPPED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED)
  - Payment request SMS
  - Support message SMS
  - Graceful "not configured" behavior when `TWILIO_*` env vars are absent
  - Kenyan phone number formatting (+254 prefix)
- ✔️ **Cloudflare R2 storage** — Upload, delete, signed URL utilities
- ✔️ **Prisma schema** — Complete relational data model
- ✔️ **Seed data** — Admin user, categories, sample products, coupons
- ✔️ **Payments** — Merchant-direct shopper mode disables new platform shopper payments; SaaS billing provider flows and historical signature-verified webhook support remain separate
- ✔️ **SaaS billing** — Database-backed Starter/Business/Enterprise plans, Stripe Checkout subscriptions, invoice-driven M-Pesa renewals, setup-fee tracking, add-ons, invoices, payment history, failed-payment handling, and legacy commission visibility
- ✔️ **Merchant handoff** — Product selections are sent to independent stores for direct confirmation and transaction handling; Nurava Tech does not collect shopper payments or present itself as merchant of record
- ✔️ **Route protection middleware** — Admin and protected route guards with role-based access control
- ✔️ **Inventory service** — Complete inventory management backend with:
  - Low stock and out-of-stock product detection
  - Inventory overview with total value and stock counts
  - Stock alerts (WARNING/CRITICAL severity)
  - Reorder suggestions based on sales velocity
  - Stock update endpoints for products and variants
  - Stock movement history tracking
- ✔️ **Recommendation engine** — Complete product recommendation system with:
  - Personalized recommendations based on user behavior (recent views, purchase history, wishlist)
  - Trending products based on sales velocity (30-day window)
  - Similar products by category, price range, and ratings
  - Featured products and new arrivals
  - Deals and on-sale products
  - RESTful API at `/api/recommendations` with multiple recommendation types

### Backend Service Layer

The backend service layer is fully implemented with proper separation of concerns, used by the Next.js App Router API routes:

- **`backend/services/order.service.ts`** — Complete order business logic:
  - `createOrder()` — Create order with stock validation and transactional updates
  - `getOrdersByUserId()` — Fetch paginated user orders
  - `getOrderById()` — Get single order with authorization checks
  - `updateOrderStatus()` — Admin order status updates with SMS/WhatsApp notifications
  - `getAllOrders()` — Admin listing with optional status filter
  - `getOrderStats()` — Order statistics for analytics dashboard

- **`backend/services/support.service.ts`** — Support ticket management with email notifications:
  - `createTicket()` — Creates ticket + sends email to support team and customer confirmation
  - `updateTicket()` — Updates ticket + notifies customer of status changes
  - `addTicketReply()` — Adds reply + notifies customer of new admin replies
  - `getAllTickets()` / `getTicketById()` / `getTicketStats()` — Ticket queries

- **`backend/services/inventory.service.ts`** — Stock management with low-stock detection, alerts, and reorder suggestions

- **`backend/services/productService.ts`** — Product queries (filter, by slug, search, create)

- **`backend/payments/`** — M-Pesa (Daraja STK Push), Stripe Cards, and Webhook handlers with order confirmation emails

- **`backend/notifications/`** — Real WhatsApp Cloud API, Twilio SMS, and Resend email integrations

**Note:** The Next.js App Router API routes in `frontend/src/app/api/` are the primary API interface. The backend services are shared modules used by these routes.

---

## ✅ Recently Implemented

- **Client customization and theme presets** — Centralized branding, site content, contact information, SEO, commerce defaults, feature flags, and reusable light/dark visual systems
- **Responsive and accessible storefront refresh** — Updated header, mobile navigation, footer grid, homepage sections, product details, search overlay, focus states, labels, and live notifications
- **Account and profile improvements** — Added account loading states, fixed account route guarding, added saved theme preferences, and added R2-backed profile image uploads with generated storage keys
- **Authentication and legal pages** — Added email verification, password reset, Privacy Policy, Cookie Policy, and Terms and Conditions routes
- **Branded loading experience** — Added responsive gradient splash wordmark, animated loading progress, route loading UI, SEO metadata, and image-host preconnects
- **Admin analytics enhancements** — Growth comparison calculations (period-over-period), CSV/JSON export functionality, and real-time growth data in metric cards
- **Order tracking & delivery notifications** — Real-time order tracking page connected to API, tracking history generated from order status changes, SMS/WhatsApp delivery notifications for all status transitions (CONFIRMED, PROCESSING, SHIPPED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED)
- **Support ticket system in admin** — Full backend API for ticket management, real-time ticket listing with filters, ticket detail modal with conversation view, reply functionality, and status updates with automatic customer notifications

## 🚦 Current Launch Status

The implementation is feature-complete at code level, but production launch remains gated on isolated staging verification. Run environment validation, database migration deployment, builds, tests, browser checks, staging health checks, and backup/restore verification before using production credentials.

## 🔮 Planned / Next Steps

- Set up deployment (Vercel for frontend and hourly lifecycle Cron, Neon for DB, Cloudflare for storage)

---

© Nurava Tech — Built with Next.js, Prisma & Tailwind CSS
