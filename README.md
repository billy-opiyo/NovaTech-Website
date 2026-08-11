# NovaTech Store — Electronics E-Commerce Platform (Kenya)

A full-stack electronics e-commerce platform built for the Kenyan market. NovaTech Store lets customers browse, search, compare, and purchase genuine phones, laptops, tablets, and accessories with warranty and fast delivery across all Kenyan counties.

The project is a **monorepo** managed with **npm workspaces**, containing a Next.js 15 frontend and a Prisma/PostgreSQL backend.

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
| **Backend**       | Prisma ORM 5, PostgreSQL (Neon), Zod (validation), bcrypt                      |
| **Auth**          | NextAuth v5 (beta) — Google OAuth + Credentials, JWT sessions                  |
| **Email**         | Resend                                                                         |
| **Storage**       | Cloudflare R2 (AWS SDK v3)                                                     |
| **Rate Limiting** | In-memory middleware (60 req/min per IP)                                       |
| **Monorepo**      | npm workspaces (`frontend` + `backend`)                                        |

---

## ✨ Implemented Features

### 🏠 Public Storefront

| Feature              | Description                                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Home Page**        | Animated hero banner, shop-by-category grid, featured products carousel, customer testimonials, and newsletter signup.                                                                      |
| **Products Catalog** | Full product listing with brand filters, price range, in-stock/on-sale toggles, category filtering, sorting (newest, price, rating), search, and pagination.                                |
| **Product Detail**   | Image gallery with zoom, product variants, pricing, stock status, warranty info, reviews section, sticky add-to-cart, recommendations (Recommended for You, Recently Viewed, Trending Now). |
| **Category Pages**   | Dedicated category landing pages (Phones, Laptops, Tablets, Accessories) with subcategories.                                                                                                |
| **Deals Page**       | Promotional deal cards linking into filtered product listings.                                                                                                                              |
| **Compare Page**     | Side-by-side product comparison with spec tables and highlight win/loss indicators.                                                                                                         |
| **Search Overlay**   | Global search with `Ctrl+K` shortcut, popular searches, product suggestions, and navigation.                                                                                                |
| **Dark Mode**        | Class-based dark theme with system-preference detection and localStorage persistence.                                                                                                       |

### 🛒 Shopping Cart & Checkout

- **Cart Context (`CartProvider`)** — client-side cart state persisted to `localStorage`:
  - Add / remove / update quantity items
  - Variant-aware item merging
  - Max-stock clamping
  - **Save for later** / **Move to cart**
  - Subtotal, shipping estimate (free shipping over KES 50,000), and total calculations
- **Cart Page** — item list with quantity controls, coupon code input (`TECH10` mock), order summary, save-for-later section.
- **Checkout Page** — multi-step wizard:
  - Shipping address form (all Kenyan counties list)
  - Delivery method selection (Standard / Express / Pickup)
  - Payment method selection (M-Pesa, Card, Cash on Delivery)
  - Order summary and final confirmation

### 👤 Authentication

- **NextAuth v5** with two providers:
  - **Google OAuth**
  - **Credentials** (email + password, verified with `bcrypt`)
- JWT session strategy with role (`CUSTOMER`, `ADMIN`, `SUPERADMIN`) and user ID attached to sessions.
- Sign-in and Sign-up pages with form validation and error handling.
- `getServerSession()` helper used across API routes for protected endpoints.

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

### 📦 Backend API (App Router Route Handlers)

| Endpoint                  | Methods                | Description                                                                                                                                                         |
| ------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/products`           | GET, POST              | Filtered product listing (search, category, brand, price, stock, sale, featured, new arrivals, sort, paginate) and admin-only product creation with Zod validation. |
| `/api/reviews`            | GET, POST, PUT, DELETE | Paginated review listing per product, create review (verified-purchase detection), update own reviews, delete own or admin reviews.                                 |
| `/api/wishlist`           | GET, POST, DELETE      | Read / add / remove wishlist items for authenticated users.                                                                                                         |
| `/api/orders`             | GET, POST              | List authenticated user's orders and place new orders (stock validation + transactional stock decrement + notification creation).                                   |
| `/api/orders/[id]`        | GET, PATCH             | Fetch single order (owner or admin), admin updates order status / tracking number with user notification.                                                           |
| `/api/coupons/validate`   | POST                   | Real coupon validation against DB (expiry, usage limit, active flag, min order value) and discount calculation.                                                     |
| `/api/contact`            | POST                   | Creates a support ticket and sends email via Resend.                                                                                                                |
| `/api/newsletter`         | POST                   | Validates email and acknowledges subscription.                                                                                                                      |
| `/api/auth/[...nextauth]` | GET, POST              | NextAuth handlers.                                                                                                                                                  |

### 🔐 Backend Services & Utilities

- **`backend/lib/db.ts`** — Prisma client singleton for dev hot-reload safety.
- **`backend/lib/email.ts`** — Resend email sending with branded order-confirmation template.
- **`backend/lib/storage.ts`** — Cloudflare R2 upload/delete/signed-URL generation.
- **`backend/lib/whatsapp.ts`** — WhatsApp integration helper.
- **`backend/middleware/rateLimiter.ts`** — In-memory IP-based rate limiting (60 requests / minute).
- **`backend/validators/productValidator.ts`** — Zod schema for product creation.
- **`backend/services/productService.ts`** — Prisma queries for filtered listing, slug lookup, search, and creation.
- **`backend/security/index.ts`** — Email sanitization, password strength check, secret masking, object sanitization.
- **`backend/actions/index.ts`** — Action-record and background-task queue stubs.

### 💳 Payments (Real Provider Integration)

- **M-Pesa** (`backend/payments/mpesa/`) — Real Daraja STK Push integration via native `fetch`:
  - `initiateMpesaPayment` — STK Push request, stores `Payment` row (PENDING).
  - `verifyMpesaPayment` — STK Push query, maps `ResultCode` → status, confirms order.
  - `simulateMpesaPayment` — Sandbox C2B simulate helper.
  - Graceful "not configured" behavior when `MPESA_*` env vars are absent.
- **Cards** (`backend/payments/cards/`) — Real Stripe Payment Intents:
  - `createCardPaymentIntent` — Creates PaymentIntent (KES), returns `clientSecret`, stores `Payment` row.
  - `verifyCardPayment` — Retrieves PaymentIntent, maps status, confirms order.
  - Graceful "not configured" behavior when `STRIPE_SECRET_KEY` is absent.
- **Webhooks** (`backend/payments/webhooks/`) — Provider-verified handlers:
  - Stripe signature verification (`stripe.webhooks.constructEvent`).
  - M-Pesa STK Push callback + C2B validation/confirmation processing.
  - Updates `Payment` + `Order` status on success/failure/refund.
- **API Routes** (`frontend/src/app/api/payments/`):
  - `POST /api/payments/mpesa/initiate` — Initiate STK Push.
  - `POST /api/payments/mpesa/verify` — Verify STK Push status.
  - `POST /api/payments/card/create-intent` — Create Stripe PaymentIntent.
  - `POST /api/payments/card/verify` — Verify PaymentIntent status.
  - `POST /api/payments/webhooks/stripe` — Stripe webhook (signature verified).
  - `POST /api/payments/webhooks/mpesa/stk-callback` — M-Pesa STK callback.
  - `POST /api/payments/webhooks/mpesa/c2b` — M-Pesa C2B callback.
- **Resend** (`backend/notifications/resend/`) — Email send stub (used by `lib/email.ts`).
- **SMS** (`backend/notifications/sms/`) — Real Twilio SMS integration with order confirmation, status updates, payment requests, and support messages.
- **WhatsApp** (`backend/notifications/whatsapp/`) — Real WhatsApp Cloud API integration with order confirmation, status updates, payment requests, and support messages.

### 🗄 Database (Prisma Schema)

Core models: `User`, `Account`, `Session`, `VerificationToken`, `Category`, `Product`, `Variant`, `CartItem`, `WishlistItem`, `RecentlyViewed`, `Order`, `OrderItem`, `Address`, `DeliveryRegion`, `Review`, `Coupon`, `Notification`, `SupportTicket`, `AdminLog`.

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
│       │   ├── (public)/         # Public route groups
│       │   │   ├── account/      # Account dashboard pages
│       │   │   ├── cart/         # Cart page
│       │   │   ├── categories/   # Category listing pages
│       │   │   ├── checkout/     # Multi-step checkout
│       │   │   ├── compare/      # Product comparison
│       │   │   ├── orders/       # Order pages
│       │   │   ├── products/     # Products catalog pages
│       │   │   ├── support/      # Support pages
│       │   │   └── wishlist/     # Wishlist page
│       │   ├── account/          # Account pages (orders, wishlist)
│       │   ├── admin/            # Admin panel
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
│       │   ├── auth/             # Sign-in & sign-up pages
│       │   ├── cart/             # Cart page
│       │   ├── category/[slug]/  # Dynamic category pages
│       │   ├── checkout/         # Checkout page
│       │   ├── compare/          # Compare page
│       │   ├── contact/          # Contact page
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
│   │   ├── rateLimiter.ts       # In-memory IP rate limiting (60 req/min)
│   │   ├── auth.middleware.ts   # (placeholder)
│   │   ├── security.middleware.ts
│   │   ├── validate.ts
│   │   └── validation.middleware.ts
│   ├── controllers/
│   │   ├── productController.ts # Product GET/POST/search handlers
│   │   └── (other stubs)
│   ├── services/
│   │   ├── productService.ts    # Product queries (filter, by slug, search, create)
│   │   └── (other stubs)
│   ├── validators/
│   │   └── productValidator.ts  # Zod product schema
│   ├── payments/
│   │   ├── mpesa/               # M-Pesa payment stubs
│   │   ├── cards/               # Card payment stubs
│   │   └── webhooks/            # Webhook handler stub
│   ├── notifications/
│   │   ├── resend/              # Email stub
│   │   ├── sms/                 # SMS stub
│   │   └── whatsapp/            # WhatsApp stub
│   ├── security/                # Sanitization utilities
│   ├── actions/                 # Action records & background task stubs
│   └── types/                   # Shared types
└── tests/                        # Test directory
```

---

## 🗄 Database Schema Overview

| Model                                       | Purpose                                                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `User`                                      | Customers & admins (roles: CUSTOMER, ADMIN, SUPERADMIN)                                                  |
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
| `NEXT_PUBLIC_R2_PUBLIC_URL`          | Public base URL for R2-hosted files                    |
| `RESEND_API_KEY`                     | Resend email API key                                   |
| `WHATSAPP_TOKEN`                     | WhatsApp Cloud API token                               |
| `WHATSAPP_PHONE_NUMBER_ID`           | WhatsApp Cloud API phone number ID                     |
| `NEXT_PUBLIC_APP_URL`                | Public app URL (e.g. `http://localhost:3000`)          |
| `MPESA_CONSUMER_KEY`                 | M-Pesa Daraja consumer key                             |
| `MPESA_CONSUMER_SECRET`              | M-Pesa Daraja consumer secret                          |
| `MPESA_PASSKEY`                      | M-Pesa Daraja passkey (STK Push)                       |
| `MPESA_SHORTCODE`                    | M-Pesa business shortcode (e.g. `174379`)              |
| `MPESA_ENV`                          | M-Pesa environment: `sandbox` or `production`          |
| `STRIPE_SECRET_KEY`                  | Stripe secret key                                      |
| `STRIPE_WEBHOOK_SECRET`              | Stripe webhook signing secret                          |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (frontend)                      |

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
Email:    admin@electrobuy.co.ke
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
| `db:push`    | `npm --workspace backend run db:push`                             | Push schema (no migration files) |
| `db:seed`    | `npm --workspace backend run db:seed`                             | Seed database                    |

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

- ✔️ **Frontend storefront** — Home, Products (filtering/sorting/search/pagination UI), Product Detail, Cart, Checkout (full payment integration), Deals, Compare, Category, Contact, Wishlist
- ✔️ **Shopping cart** — Client-side state with `localStorage` persistence, save-for-later, quantity & stock management, shipping/total calculation
- ✔️ **Authentication** — NextAuth v5 with Google OAuth + Credentials (bcrypt), JWT sessions, role-based access
- ✔️ **Admin panel UI** — Layout, sidebar navigation, Dashboard, Analytics, Products management, Orders management, Customers, Reviews, Coupons, Inventory, Deliveries, Support Tickets, Messages, Settings, Security, Activity Log
- ✔️ **Dark/light theme** — ThemeProvider with system preference detection
- ✔️ **Global search** — Search overlay with keyboard shortcut & suggestions
- ✔️ **Product API** — Filtering, pagination, search, creation (admin-protected, Zod validated)
- ✔️ **Order API** — List, create (transactional stock decrement, validation, notifications), admin status update
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
- ✔️ **Rate limiting** — 60 req/min per IP on sensitive endpoints
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
- ✔️ **Payments** — M-Pesa (Daraja STK Push), Cards (Stripe Payment Intents), and Webhooks (signature-verified) fully implemented with graceful "not configured" fallback
- ✔️ **Checkout payment integration** — Full checkout-to-payment flow implemented:
  - Order creation via `/api/orders` with transactional stock validation
  - M-Pesa STK Push flow with real-time status polling
  - Stripe PaymentIntent creation and verification
  - Cash on Delivery support
  - Real-time payment status indicators
  - Error handling with user-friendly messages
  - Post-payment order confirmation with email notifications
- ✔️ **Route protection middleware** — Admin and protected route guards with role-based access control

### Partially Implemented / Stubs

- ⚠️ **Backend controllers/services** — `order`, `payment`, `review`, `auth` controllers and `inventory`, `recommendation`, `order` services are **empty placeholders** (core logic lives in the App Router API routes)
- ⚠️ **Backend route files** (`backend/routes/`) — empty placeholders

---

## 🔮 Planned / Next Steps

- Implement backend inventory alerts and recommendation engine
- Enhance admin analytics with growth comparisons and export functionality
- Add order tracking and delivery notifications (SMS/WhatsApp)
- Add support ticket system in admin
- Set up deployment (Vercel for frontend, Neon for DB, Cloudflare for storage)

---

© NovaTech Store — Built with Next.js, Prisma & Tailwind CSS