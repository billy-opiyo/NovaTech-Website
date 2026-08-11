# NovaTech Store — Project Architecture Rules

Production-grade web application development rules and standards for the NovaTech Store e-commerce platform.

---

## 📋 Table of Contents

1. [Mandatory Technology Stack](#-mandatory-technology-stack)
2. [Coding Standards](#-coding-standards)
3. [Security Requirements](#-security-requirements)
4. [Reverse Engineering Mitigation](#-reverse-engineering-mitigation)
5. [File Structure](#-file-structure)
6. [Before Any Modification](#-before-any-modification)

---

## 🛠 Mandatory Technology Stack

### Frontend

| Technology | Requirement |
| ---------- | ----------- |
| **Next.js** | Latest stable version |
| **React** | Latest stable version |
| **TypeScript** | For all React Components, hooks, utilities and frontend logic |
| **JavaScript** | Only when required by external libraries or build tools |
| **Hosting** | Cloudflare or Vercel (mostly Vercel) |

### Backend

| Technology | Requirement |
| ---------- | ----------- |
| **Node.js** | Runtime |
| **Next.js** | API routes or dedicated Node.js services |
| **TypeScript** | For all backend code |
| **JavaScript** | Only when absolutely necessary |
| **Database** | Neon PostgreSQL Database, Auth.js Authentication & Server Actions Middleware (Next.js) |
| **API** | Next.js API routes will do the Web Service work |
| **ORM** | Prisma for schemas, queries and type safety cleaning |
| **Storage** | Cloudflare R2 Storage |
| **Email** | Resend |
| **Messaging** | WhatsApp Cloud APIs |
| **Database URL** | When setting up Database URL in Prisma, use Neon's Pooled Connection string (`-pooler` in the host address) rather than the direct connection string |

---

## 📝 Coding Standards

1. Always use TypeScript (`.ts` and `.tsx` files) by default.
2. Avoid plain JavaScript unless there is a documented technical reason.
3. Use strict TypeScript typing.
4. No use of `any` unless unavoidable.
5. Use reusable React components.
6. Follow clean architecture principles.
7. Separate frontend, backend and shared code.
8. Use environment variables for secrets.
9. Never hardcode API keys, passwords, tokens or database credentials.

---

## 🔐 Security Requirements

1. All sensitive business logic must remain on the backend.
2. Never expose secret keys to the frontend.
3. Validate all inputs on both client and server.
4. Implement authentications and authorization checks on the server.
5. Sanitize user-generated content.
6. Use HTTPS-only API communication.
7. Implement rate limiting for public APIs.
8. Use secure password hashing (bcrypt or Argon2).
9. Use JWT or secure session management.
10. Protect against XSS, CSRF, SQL Injection, and SSRF attacks.
11. Bot Protection by Cloudflare Turnstile.
12. Web Application Firewall by Cloudflare.

---

## 🛡️ Reverse Engineering Mitigation

1. Keep proprietary algorithms on the backend.
2. Never expose database queries to the frontend.
3. Never expose internal business rules to browser code.
4. Minimize frontend exposure to sensitive logic.
5. Use code splitting and production builds.
6. Store sensitive calculations on the server.
7. Use API gateways and server-side validation.

---

## 📁 File Structure

```
/frontend
  /components
  /hooks
  /pages
  /app
  /styles

/backend
  /controllers
  /services
  /middleware
  /routes
```

---

## ⚠️ Before Any Modification

When creating, writing or editing files:

1. Check whether the change belongs to frontend or backend.
2. Use TypeScript by default.
3. Follow the existing project architecture rules.
4. Do not introduce new framework without approval.
5. Maintain compatibility with Next.js, React, Node.js, TypeScript and JavaScript.

---

> **NB:** These rules are mandatory and must be followed for every code generation, refactoring, bug fixing, feature addition, and deployment task.