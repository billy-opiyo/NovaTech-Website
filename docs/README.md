# NovaTech Store — Documentation

This directory contains documentation for the NovaTech Store e-commerce platform, a full-stack electronics marketplace built for the Kenyan market.

## Project Overview

NovaTech Store is a **monorepo** managed with **npm workspaces**, containing:

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Backend**: Prisma ORM 5, PostgreSQL (Neon), Node.js

The platform enables customers to browse, search, compare, and purchase genuine electronics (phones, laptops, tablets, and accessories) with warranty and fast delivery across all Kenyan counties.

## Page links

Start the local server with `npm run dev`. The development server uses `http://localhost:3000`; the production base URL is `https://novatechstore.co.ke`.

The tables below list every UI page implemented under `frontend/src/app`. `Signed in` pages redirect unauthenticated visitors to sign-in. `Admin` pages require an `ADMIN` or `SUPERADMIN` account.

### Storefront

| Page | Access | Development | Production |
|---|---|---|---|
| Home | Public | [Open](http://localhost:3000/) | [Open](https://novatechstore.co.ke/) |
| Products | Public | [Open](http://localhost:3000/products) | [Open](https://novatechstore.co.ke/products) |
| Product detail | Public; dynamic | `http://localhost:3000/products/{product-slug}` | `https://novatechstore.co.ke/products/{product-slug}` |
| Category landing | Public; dynamic | `http://localhost:3000/category/{category-slug}` | `https://novatechstore.co.ke/category/{category-slug}` |
| Phones category | Public | [Open](http://localhost:3000/category/phones) | [Open](https://novatechstore.co.ke/category/phones) |
| Laptops category | Public | [Open](http://localhost:3000/category/laptops) | [Open](https://novatechstore.co.ke/category/laptops) |
| Tablets category | Public | [Open](http://localhost:3000/category/tablets) | [Open](https://novatechstore.co.ke/category/tablets) |
| Accessories category | Public | [Open](http://localhost:3000/category/accessories) | [Open](https://novatechstore.co.ke/category/accessories) |
| Deals | Public | [Open](http://localhost:3000/deals) | [Open](https://novatechstore.co.ke/deals) |
| Compare products | Public | [Open](http://localhost:3000/compare) | [Open](https://novatechstore.co.ke/compare) |
| Contact | Public | [Open](http://localhost:3000/contact) | [Open](https://novatechstore.co.ke/contact) |
| Cart | Signed in | [Open](http://localhost:3000/cart) | [Open](https://novatechstore.co.ke/cart) |
| Checkout | Signed in | [Open](http://localhost:3000/checkout) | [Open](https://novatechstore.co.ke/checkout) |

### Authentication

| Page | Access | Development | Production |
|---|---|---|---|
| Sign in | Public | [Open](http://localhost:3000/auth/signin) | [Open](https://novatechstore.co.ke/auth/signin) |
| Sign up | Public | [Open](http://localhost:3000/auth/signup) | [Open](https://novatechstore.co.ke/auth/signup) |
| Forgot password | Public | [Open](http://localhost:3000/auth/forgot-password) | [Open](https://novatechstore.co.ke/auth/forgot-password) |

### Customer account

| Page | Access | Development | Production |
|---|---|---|---|
| Account overview | Signed in | [Open](http://localhost:3000/account) | [Open](https://novatechstore.co.ke/account) |
| Orders | Signed in | [Open](http://localhost:3000/account/orders) | [Open](https://novatechstore.co.ke/account/orders) |
| Order detail | Signed in; dynamic | `http://localhost:3000/account/orders/{order-id}` | `https://novatechstore.co.ke/account/orders/{order-id}` |
| Order tracking | Signed in; dynamic | `http://localhost:3000/account/orders/{order-id}/track` | `https://novatechstore.co.ke/account/orders/{order-id}/track` |
| Addresses | Signed in | [Open](http://localhost:3000/account/addresses) | [Open](https://novatechstore.co.ke/account/addresses) |
| Wishlist | Signed in | [Open](http://localhost:3000/account/wishlist) | [Open](https://novatechstore.co.ke/account/wishlist) |
| Notifications | Signed in | [Open](http://localhost:3000/account/notifications) | [Open](https://novatechstore.co.ke/account/notifications) |
| Account settings | Signed in | [Open](http://localhost:3000/account/settings) | [Open](https://novatechstore.co.ke/account/settings) |

### Admin console

| Page | Access | Development | Production |
|---|---|---|---|
| Admin root (redirects to dashboard) | Admin | [Open](http://localhost:3000/admin) | [Open](https://novatechstore.co.ke/admin) |
| Dashboard | Admin | [Open](http://localhost:3000/admin/dashboard) | [Open](https://novatechstore.co.ke/admin/dashboard) |
| Analytics | Admin | [Open](http://localhost:3000/admin/analytics) | [Open](https://novatechstore.co.ke/admin/analytics) |
| Products | Admin | [Open](http://localhost:3000/admin/products) | [Open](https://novatechstore.co.ke/admin/products) |
| Orders | Admin | [Open](http://localhost:3000/admin/orders) | [Open](https://novatechstore.co.ke/admin/orders) |
| Customers | Admin | [Open](http://localhost:3000/admin/customers) | [Open](https://novatechstore.co.ke/admin/customers) |
| Reviews | Admin | [Open](http://localhost:3000/admin/reviews) | [Open](https://novatechstore.co.ke/admin/reviews) |
| Coupons | Admin | [Open](http://localhost:3000/admin/coupons) | [Open](https://novatechstore.co.ke/admin/coupons) |
| Inventory | Admin | [Open](http://localhost:3000/admin/inventory) | [Open](https://novatechstore.co.ke/admin/inventory) |
| Deliveries | Admin | [Open](http://localhost:3000/admin/deliveries) | [Open](https://novatechstore.co.ke/admin/deliveries) |
| Support tickets | Admin | [Open](http://localhost:3000/admin/support) | [Open](https://novatechstore.co.ke/admin/support) |
| Messages | Admin | [Open](http://localhost:3000/admin/messages) | [Open](https://novatechstore.co.ke/admin/messages) |
| Settings | Admin | [Open](http://localhost:3000/admin/settings) | [Open](https://novatechstore.co.ke/admin/settings) |
| Security | Admin | [Open](http://localhost:3000/admin/security) | [Open](https://novatechstore.co.ke/admin/security) |
| Activity log | Admin | [Open](http://localhost:3000/admin/activity) | [Open](https://novatechstore.co.ke/admin/activity) |

### Dynamic URL values

- `{product-slug}` is the product's `slug` value, for example `iphone-15-pro-max`.
- `{category-slug}` is a category slug, such as `phones`, `laptops`, `tablets`, or `accessories`.
- `{order-id}` is the ID shown on the signed-in customer's Orders page.

API route handlers in `frontend/src/app/api` are intentionally excluded: they are backend endpoints rather than browser pages. For their reference, see the root [API endpoints documentation](../README.md#-backend-api-app-router-route-handlers).

## Documentation Structure

| File | Description |
|------|-------------|
| `README.md` | This overview file |
| `features.md` | Comprehensive list of all implemented features |

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS 3, Framer Motion, lucide-react |
| **Backend** | Prisma ORM 5, PostgreSQL, Zod, bcrypt |
| **Auth** | NextAuth v5 (beta) — Google OAuth + Credentials |
| **Email** | Resend |
| **Storage** | Cloudflare R2 (AWS SDK v3) |
| **Payments** | M-Pesa (Daraja STK Push), Stripe Payment Intents |
| **Notifications** | Twilio SMS, WhatsApp Cloud API |
| **Monorepo** | npm workspaces (`frontend` + `backend`) |

## Quick Links

- [Features](features.md) — Complete list of implemented features
- [Page links](#page-links) — Development and production URLs for every UI page
- [Database Schema](../README.md#database-schema-overview) — Prisma model overview
- [API Endpoints](../README.md#-backend-api-app-router-route-handlers) — Backend API reference
- [Environment Variables](../README.md#-environment-variables) — Required config variables
- [Getting Started](../README.md#-getting-started) — Development setup guide
