# NovaTech Store — Documentation

This directory contains documentation for the NovaTech Store e-commerce platform, a full-stack electronics marketplace built for the Kenyan market.

## Project Overview

NovaTech Store is a **monorepo** managed with **npm workspaces**, containing:

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Backend**: Prisma ORM 5, PostgreSQL (Neon), Node.js

The platform enables customers to browse, search, compare, and purchase genuine electronics (phones, laptops, tablets, and accessories) with warranty and fast delivery across all Kenyan counties.

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
- [Database Schema](README.md#database-schema-overview) — Prisma model overview
- [API Endpoints](README.md#api-endpoints) — Backend API reference
- [Environment Variables](README.md#environment-variables) — Required config variables
- [Getting Started](README.md#getting-started) — Development setup guide