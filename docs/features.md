# NovaTech Store — Features

## 🏠 Public Storefront

| Feature | Description |
|---------|-------------|
| **Home Page** | Animated hero banner, shop-by-category grid, featured products carousel, customer testimonials, and newsletter signup. |
| **Products Catalog** | Full product listing with brand filters, price range, in-stock/on-sale toggles, category filtering, sorting (newest, price, rating), search, and pagination. |
| **Product Detail** | Image gallery with zoom, product variants, pricing, stock status, warranty info, reviews section, sticky add-to-cart, recommendations (Recommended for You, Recently Viewed, Trending Now). |
| **Category Pages** | Dedicated category landing pages (Phones, Laptops, Tablets, Accessories) with subcategories. |
| **Deals Page** | Promotional deal cards linking into filtered product listings. |
| **Compare Page** | Side-by-side product comparison with spec tables and highlight win/loss indicators. |
| **Search Overlay** | Global search with `Ctrl+K` shortcut, popular searches, product suggestions, and navigation. |
| **Dark Mode** | Class-based dark theme with system-preference detection and localStorage persistence. |

## 🛒 Shopping Cart & Checkout

| Feature | Description |
|---------|-------------|
| **Cart Context** (`CartProvider`) | Client-side cart state persisted to `localStorage`:<br>- Add / remove / update quantity items<br>- Variant-aware item merging<br>- Max-stock clamping<br>- **Save for later** / **Move to cart**<br>- Subtotal, shipping estimate (free shipping over KES 50,000), and total calculations |
| **Cart Page** | Item list with quantity controls, coupon code input (`TECH10` mock), order summary, save-for-later section. |
| **Checkout Page** | Multi-step wizard:<br>- Shipping address form (all Kenyan counties list)<br>- Delivery method selection (Standard / Express / Pickup)<br>- Payment method selection (M-Pesa, Card, Cash on Delivery)<br>- Order summary and final confirmation |

## 👤 Authentication

| Feature | Description |
|---------|-------------|
| **NextAuth v5** | Two providers:<br>- **Google OAuth**<br>- **Credentials** (email + password, verified with `bcrypt`)|
| **JWT Sessions** | Role-based (`CUSTOMER`, `ADMIN`, `SUPERADMIN`) with user ID attached to sessions.|
| **Sign-in/Sign-up Pages** | Form validation and error handling.|
| **Session Protection** | `getServerSession()` helper used across API routes for protected endpoints.|

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

## 📦 Backend API (App Router Route Handlers)

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/products` | GET, POST | Filtered product listing (search, category, brand, price, stock, sale, featured, new arrivals, sort, paginate) and admin-only product creation with Zod validation. |
| `/api/reviews` | GET, POST, PUT, DELETE | Paginated review listing per product, create review (verified-purchase detection), update own reviews, delete own or admin reviews. |
| `/api/wishlist` | GET, POST, DELETE | Read / add / remove wishlist items for authenticated users. |
| `/api/orders` | GET, POST | List authenticated user's orders and place new orders (stock validation + transactional stock decrement + notification creation). |
| `/api/orders/[id]` | GET, PATCH | Fetch single order (owner or admin), admin updates order status / tracking number with user notification. |
| `/api/coupons/validate` | POST | Real coupon validation against DB (expiry, usage limit, active flag, min order value) and discount calculation. |
| `/api/contact` | POST | Creates a support ticket and sends email via Resend (support team + customer confirmation). |
| `/api/newsletter` | POST | Validates email and acknowledges subscription. |
| `/api/products/upload` | POST | Admin product image upload to Cloudflare R2 (images only, 5MB max). |
| `/api/auth/[...nextauth]` | GET, POST | NextAuth handlers. |

## 🔐 Backend Services & Utilities

| Service / Utility | Description |
|-------------------|-------------|
| `backend/lib/db.ts` | Prisma client singleton for dev hot-reload safety. |
| `backend/lib/email.ts` | Resend email sending with branded order-confirmation template. |
| `backend/lib/storage.ts` | Cloudflare R2 file operations (upload, delete, signed-URL generation). |
| `backend/lib/whatsapp.ts` | WhatsApp integration helper. |
| `backend/middleware/rateLimiter.ts` | In-memory IP-based rate limiting (60 requests / minute). |
| `backend/validators/productValidator.ts` | Zod schema for product creation. |
| `backend/services/productService.ts` | Prisma queries for filtered listing, slug lookup, search, and creation. |
| `backend/security/index.ts` | Email sanitization, password strength check, secret masking, object sanitization. |
| `backend/actions/index.ts` | Action-record logging to `AdminLog` and background-task queue. |

## 💳 Payments (Real Provider Integration)

### M-Pesa (`backend/payments/mpesa/`)

| Feature | Description |
|---------|-------------|
| `initiateMpesaPayment` | STK Push request, stores `Payment` row (PENDING). |
| `verifyMpesaPayment` | STK Push query, maps `ResultCode` → status, confirms order. |
| `simulateMpesaPayment` | Sandbox C2B simulate helper. |
| Graceful fallback | "not configured" behavior when `MPESA_*` env vars are absent. |

### Cards (`backend/payments/cards/`)

| Feature | Description |
|---------|-------------|
| `createCardPaymentIntent` | Creates PaymentIntent (KES), returns `clientSecret`, stores `Payment` row. |
| `verifyCardPayment` | Retrieves PaymentIntent, maps status, confirms order. |
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
| `POST /api/payments/mpesa/initiate` | Initiate STK Push. |
| `POST /api/payments/mpesa/verify` | Verify STK Push status. |
| `POST /api/payments/card/create-intent` | Create Stripe PaymentIntent. |
| `POST /api/payments/card/verify` | Verify PaymentIntent status. |
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
| **Email Sanitization** | Prevents email injection attacks. |
| **Password Strength Check** | Validates password complexity. |
| **Object Sanitization** | Sanitizes incoming objects for security. |
| **Cloudflare R2 Storage** | Upload, delete, signed URL utilities for product images. |
| **Twilio SMS Integration** | Real SMS sending with Kenyan number formatting. |
| **WhatsApp Cloud API** | Real WhatsApp messaging integration. |
| **Resend Email** | Branded order-confirmation email templates. |
| **Prisma Schema** | Complete relational data model with proper relationships. |
| **Seed Data** | Admin user, categories, sample products, coupons. |
| **Payments** | M-Pesa (Daraja STK Push), Cards (Stripe Payment Intents), and Webhooks (signature-verified) fully implemented with graceful "not configured" fallback. |
| **Checkout Payment Flow** | Full checkout-to-payment flow:<br>- Order creation via `/api/orders` with transactional stock validation<br>- M-Pesa STK Push flow with real-time status polling<br>- Stripe PaymentIntent creation and verification<br>- Cash on Delivery support<br>- Real-time payment status indicators<br>- Error handling with user-friendly messages<br>- Post-payment order confirmation with email notifications |
| **Route Protection Middleware** | Admin and protected route guards with role-based access control. |
| **Inventory Service** | Complete inventory management backend with:<br>- Low stock and out-of-stock product detection<br>- Inventory overview with total value and stock counts<br>- Stock alerts (WARNING/CRITICAL severity)<br>- Reorder suggestions based on sales velocity<br>- Stock update endpoints for products and variants<br>- Stock movement history tracking |
| **Recommendation Engine** | Complete product recommendation system with:<br>- Personalized recommendations based on user behavior (recent views, purchase history, wishlist)<br>- Trending products based on sales velocity (30-day window)<br>- Similar products by category, price range, and ratings<br>- Featured products and new arrivals<br>- Deals and on-sale products<br>- RESTful API at `/api/recommendations` with multiple recommendation types |