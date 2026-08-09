**_PROJECT ARCHITECTURE RULES_**

Production
– Grade Web Application

**MANDATORY TECHNOLOGY STACK**

**_Frontend:_**

ü
Next.js
(latest stable version)

ü
React

ü
Typescript
For all React Components, hooks, utilities and frontend logic

ü
JavaScript
only when required by external libraries or build tools

ü
Cloudflare
or Vercel Hosting But mostly use Vercel.

**_Backend:_**

ü
Node.js
runtime

ü
Next.js
API routes or dedicated Node.js services

ü
Typescript
for all backend codes

ü
JavaScript
only when absolutely necessary

ü
Neon
PostgreSQL Database, Auth.js Authentication & Server Actions Middleware (Next.js)

ü
Next.js
API routes will do the Web Service work

ü
ORM
Prisma For schemas, queries and type safety cleaning.

ü
Cloudflare
R2 Storage

ü
Resend
For Emails

ü
WhatsApp
Cloud APIs

ü
When
setting up Database URL in Prisma use Neon’s Pooled Connection string (-pooler
in the host address) rather than the direct connection string.

**CODING STANDARDS**

1.  Always
    use TypeScript (.ts and .tsx files) by default.

2.  Avoid
    Plain JavaScript unless there is a documented technical reason.

3.  Use
    strict TypeScript typing.

4.  No
    use of “any” unless unavoidable.

5.  Use
    reusable React components.

6.  Follow
    clean architecture principles

7.  Separate
    frontend, backend and shared code.

8.  Use
    environment variables for secrets

9.  Never
    hardcode API keys, passwords, tokens or database credentials

**SECURITY REQUIREMENTS**

1.  All
    sensitive business logic must remain on the backend.

2.  Never
    expose secret keys to the frontend.

3.  Validate
    all inputs on both client and server

4.  Implement
    authentications and authorization checks on the server.

5.  Sanitize
    user-generated content.

6.  Use
    HTTPS-only API communication.

7.  Implement
    rate limiting for public APIs.

8.  Use
    secure password hashing (bycrypt or Argon2)

9.  Use
    JWT or secure session management.

10. Protect against XSS, CSRF, SQL
    Injection, and SSRF attacks.

11. Bot Protection by Cloudflare
    Turnstile

12. Web Application Firewall by
    Cloudflare

**REVERSE ENGINEERING MITIGATION**

1.  Keep
    proprietary algorithms on the backend.

2.  Never
    expose database queries to the frontend.

3.  Never
    expose internal business rules to browser code.

4.  Minimize
    frontend exposure to sensitive logic.

5.  Use
    code splitting and production builds.

6.  Store
    Sensitive Calculations on the server.

7.  Use
    API gateways and server-side validation.

**FILE STRUCTURE**

/frontend /components  
/hooks /pages /app /styles

/backend /controllers /services  
/middleware /routes

**BEFORE ANY MODIFICATION**

When
creating, writing or editing files:

1.  Check
    whether the change belongs to frontend or backend.

2.  Use
    TypeScript by Default

3.  Follow
    the existing project architecture rules.

4.  Do
    not introduce new framework without approval.

5.  Maintain
    compatibility with Next.js, React, Node.js, TypeScript and JavaScript.

NB//:
These rules are mandatory and must be
followed for every code generation, refactoring, bug fixing, feature addition,
and deployment task.
