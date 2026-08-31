# 🛡️ Project Audit Fix Handoff

> **You are acting as a senior software architect, QA engineer, security auditor, and full-stack reviewer.**

## 🧰 PROJECT STACK

- Next.js
- React
- TypeScript
- Node.js
- ORM Prisma
- Neon PostgreSQL
- Auth.js (if present)
- Next.js API Routes
- Cloudflare R2 Storage
- Vercel Hosting
- Resend For Emails
- WhatsApp Cloud APIs for Messaging
- Twilio for SMS
- Mpesa Daraja API for Payments
- Modern responsive web application

---

## 📏 IMPORTANT RULES

1. **DO NOT start fixing code immediately.**
2. First perform a **COMPLETE PROJECT-WIDE AUDIT**.
3. Scan the **ENTIRE codebase** before making any modifications.
4. Assume there may be hidden bugs, edge cases, security issues, performance issues, architectural issues, and user-flow issues.
5. Continue auditing until you have gathered all findings into a single report.
6. Create a file named `BUG_AUDIT.md` and use it as the source of truth throughout the audit and repair process.
7. Every issue discovered must be recorded before any fixes begin.
8. Categorize issues as:
   - 🔴 Critical
   - 🟠 High
   - 🟡 Medium
   - 🟢 Low
9. Every issue must have one of these statuses:
   - ⏳ Pending
   - 🔄 In Progress
   - ✔️ Fixed
   - ✅ Verified

---

## 📋 PHASE 1 — FULL CODEBASE AUDIT

**Perform a complete review of:**

### A. TypeScript

- Type errors
- Unsafe types
- Missing type definitions
- Incorrect interfaces
- Improper generics
- Potential runtime type issues

### B. React

- State management issues
- Re-render issues
- Stale closures
- Hook dependency problems
- Memory leaks
- Component lifecycle issues
- Context issues
- Form state issues

### C. Next.js

- App Router issues
- Server Component issues
- Client Component issues
- Routing problems
- Middleware issues
- SSR/CSR mismatches
- Hydration issues
- Caching issues
- Metadata issues
- Dynamic routes

### D. API Routes

- Validation issues
- Error handling issues
- Missing edge cases
- Incorrect HTTP responses
- Broken request handling
- Missing authentication
- Missing authorization

### E. Database Layer

- Prisma schema issues
- Broken relationships
- N+1 query problems
- Missing indexes
- Data integrity issues
- Transaction issues
- Migration risks
- Query performance issues

### F. Authentication & Authorization

- Session handling
- Role-based access issues
- Route protection
- Middleware protection
- Token validation
- Permission bypass risks

### G. Security Audit

- XSS vulnerabilities
- CSRF vulnerabilities
- Injection risks
- Sensitive data exposure
- Environment variable misuse
- Insecure API endpoints
- Authentication weaknesses
- Authorization weaknesses

### H. Performance Audit

- Unnecessary re-renders
- Large bundle sizes
- Slow database queries
- Expensive API calls
- Poor caching strategies
- Slow page loads
- Image optimization issues

### I. UI/UX Audit

- Broken navigation
- Broken buttons
- Broken forms
- Validation issues
- Accessibility issues
- Responsive design issues
- Empty states
- Loading states
- Error states

### J. Business Logic Audit

- Logical flaws
- Incorrect calculations
- Missing validations
- Edge cases
- Workflow failures
- Race conditions
- State inconsistencies

### K. Architecture Review

- Duplicate logic
- Dead code
- Unused files
- Circular dependencies
- Poor separation of concerns
- Maintainability issues

### L. SaaS Business Flow Audit

**Perform a complete audit of all SaaS-specific workflows and business rules.**

**Review and verify:**

- Merchant onboarding flow
- Merchant registration flow
- Merchant profile creation
- Merchant account activation
- Merchant account suspension
- Merchant account reactivation
- Subscription plan assignment
- Setup fee calculations
- Monthly billing calculations
- Subscription renewals
- Subscription upgrades
- Subscription downgrades
- Subscription cancellations
- Trial account handling
- Trial expiration handling
- Failed payment handling
- Duplicate payment prevention
- Payment verification logic
- Billing edge cases
- Invoice generation (if present)

#### 🔐 Multi-Tenant Security Validation

- Verify merchants can only access their own data
- Verify merchants cannot access other merchants' products
- Verify merchants cannot access other merchants' orders
- Verify merchants cannot access other merchants' customers
- Verify merchants cannot manipulate URLs to access other accounts
- Verify all API routes enforce ownership checks
- Verify all database queries are tenant-scoped

#### 🧮 Data Integrity Validation

- Inventory consistency
- Product consistency
- Order consistency
- Dashboard statistics accuracy
- Revenue calculations accuracy
- Analytics accuracy

#### 🔄 Workflow Validation

- Product creation
- Product editing
- Product deletion
- Inventory updates
- Order workflows
- Checkout workflows
- Notification workflows
- Email integrations
- WhatsApp integrations
- SMS integrations

#### ⚠️ Edge Case Testing

- Expired subscriptions
- Inactive merchants
- Duplicate transactions
- Interrupted transactions
- Network failures during payments
- Concurrent updates
- Race conditions
- Missing or corrupted data

> 📌 **Record all findings in `BUG_AUDIT.md` before any fixes begin.**

---

## 🤖 PHASE 2 — AUTOMATED VERIFICATION

**Run and analyze:**

- `npm install` (if needed)
- `npm run lint`
- `npm run build`
- `npm run type-check`
- `npm run test` (if available)

**If scripts differ, detect and use the correct project scripts.**

> 📌 **Record all failures in `BUG_AUDIT.md`.**

---

## 🧪 PHASE 3 — USER FLOW TESTING

**Use Playwright to inspect and test:**

- Homepage
- Authentication flows
- Registration flow
- Login flow
- Logout flow
- Protected routes
- Dashboard
- Settings pages
- Forms
- Search features
- Navigation menus
- Mobile navigation
- API-driven pages
- CRUD operations
- Billing flows (if present)
- Checkout/payment flows (if present)

**Perform smoke testing and identify:**

- Broken links
- Console errors
- Network failures
- Runtime exceptions
- UX blockers

> 📌 **Record all findings before fixing.**

---

## 📊 PHASE 4 — MASTER ISSUE REPORT

**Before modifying code:**

**Generate a complete issue report in `BUG_AUDIT.md` containing:**

- File path
- Issue description
- Severity
- Root cause
- Recommended fix

> ⛔ **Do not start repairs until the report is complete.**

---

## 🔧 PHASE 5 — SYSTEMATIC REPAIR

**After the audit report is complete:**

1. Fix all **Critical** issues.
2. Fix all **High** issues.
3. Fix all **Medium** issues.
4. Fix all **Low** issues.

**Update `BUG_AUDIT.md` continuously.**

**Mark issues as:**

`Pending` → `In Progress` → `Fixed` → `Verified`

---

## ♻️ PHASE 6 — RECURSIVE VALIDATION

**After repairs:**

- Run lint again.
- Run build again.
- Run type-check again.
- Run tests again.
- Run Playwright testing again.

**Then perform another full codebase audit.**

**If new issues are discovered:**

- Add them to `BUG_AUDIT.md`.
- Fix them.
- Re-verify them.

> 🔁 **Continue this cycle until TWO CONSECUTIVE FULL AUDITS discover no new issues.**

---

## ✅ PHASE 7 — FINAL QUALITY GATE

**Do not stop until:**

- ✓ Build succeeds.
- ✓ Lint succeeds.
- ✓ Type checking succeeds.
- ✓ Tests succeed.
- ✓ Playwright smoke tests succeed.
- ✓ No Critical issues remain.
- ✓ No High issues remain.
- ✓ No unverified fixes remain.
- ✓ No broken user flows remain.
- ✓ Two consecutive audits find no new issues.

---

## 📄 FINAL OUTPUT

**Provide a `FINAL_AUDIT_REPORT.md` containing:**

1. Total issues found.
2. Total issues fixed.
3. Issues verified.
4. Remaining issues (if any).
5. Security findings.
6. Performance findings.
7. Architecture findings.
8. Playwright test results.
9. Build results.
10. Lint results.
11. Type-check results.
12. Test results.
13. Confidence assessment of overall project health.

> 🚦 **Do not finish early. Continue auditing, fixing, validating, and re-auditing until the project reaches the final quality gate.**
