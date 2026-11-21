# Technical SEO: sitemap and robots

## Initial audit

- The frontend is Next.js 15 (App Router only), under `frontend/src/app`. No Pages Router is present.
- There was no existing `sitemap.ts`, `robots.ts`, `sitemap.xml`, or `robots.txt` implementation.
- The root layout generated a store-specific title, description, keywords, and Open Graph metadata. It did not emit canonical URLs. The manage and platform layouts already set `noindex`; admin, account, auth, onboarding, cart, and checkout did not have a general indexing policy.
- Merchant routes use `{storeSlug}.{PLATFORM_DOMAIN}`. On a shared platform host, middleware also rewrites `/store/{storeSlug}` paths to the selected tenant. Verified custom domains can resolve to stores, but the public directory helper links to platform subdomains.
- Public storefront eligibility in the existing directory requires a published store and an active/trialing/grace-period tenant; merchants must be approved. The code also identifies staging/demo store slugs. The sitemap additionally excludes soft-deleted or data-deleted tenants.
- The first-party store's verified slug in this branch is `nurava-marketplace`. It is not in the four-slug demo exclusion (`nuravatech`, `nurava-furnitures`, `nurava-cakes`, `nurava-boutiques`), so it remains eligible. The sitemap does not assume that it is the only published store; future eligible merchant stores are discovered from the database as they are published.
- Products have `isPublished` and `updatedAt`; categories have `active`; posts have `status`, `publishedAt`, and `updatedAt`. The sitemap uses these fields and never selects customer, authentication, payment, or credential data.
- Middleware protects admin, manage, platform, account, cart, and checkout behavior. Public pages include the homepage, store directory, information/legal pages, product/category pages on store hosts, and published blog content.
- `vercel.json` only configures the lifecycle cron. It contains no domain or sitemap rewrite configuration.

## Domain and environment finding

The requested canonical domain is `nuravahubstores.com`, and the source-level platform resolver defaults to it. The checked-in production environment file also names it, but sets `NEXT_PUBLIC_APP_URL` to HTTP. Other repository material still names `nuravatech.com` as the production domain, including `frontend/src/config/client.config.ts`, the DNS runbook, and architecture/user documentation. DNS, registrar ownership, and the Vercel production domain mapping are not verifiable from this repository. The new SEO output uses HTTPS and `getPlatformDomain()`; production deployment must set `PLATFORM_DOMAIN=nuravahubstores.com`. This is target configuration, not evidence that the domain has been purchased, connected, or is serving production.

## Implementation

- `frontend/src/app/sitemap.xml/route.ts` serves the sitemap index at `/sitemap.xml`; `frontend/src/app/sitemap/[id].xml/route.ts` serves child XML files, and `frontend/src/lib/sitemap.ts` builds the filtered entries. It splits child files at 45,000 URLs (15,000 storefronts, because each contributes three URLs). Entries cover published storefronts and their product/blog indexes, eligible products, active configured categories, and published platform or tenant blog posts. Entry URLs use HTTPS on the platform apex or `{storeSlug}.{platformDomain}`.
- Product and article entries use their reliable database `updatedAt` value. Storefront home entries use the store `updatedAt` value. Fixed pages and categories omit `lastmod` because the source has no reliable page/category modification timestamp.
- Sitemap responses use shared-cache headers for one hour with stale-while-revalidate. Database count errors return an index pointing to the fixed sitemap page; a page query error returns an empty child sitemap and logs the failure. Empty content counts produce only the fixed sitemap page.
- `frontend/src/app/robots.ts` allows page and asset crawling and references the production sitemap. Private/account/auth/checkout/onboarding pages use `noindex,nofollow` metadata so crawlers can fetch them and read the directive; robots.txt is not used as an access-control or indexing mechanism. API routes are not blanket-blocked.
- The root layout now emits canonical URLs on the configured apex or canonical store subdomain and removes query strings. It also applies `noindex,nofollow` to private/account/auth/checkout/onboarding paths. Sitemap and canonical output intentionally follow platform subdomains even when a verified custom domain resolves to the same tenant.

## Deployment checks still required

This source change does not register the domain, change DNS/Vercel settings, deploy, or verify live HTTP responses. Before launch, reconcile the repository's `nuravatech.com` configuration and documentation with the user's requested `nuravahubstores.com`, confirm the domain and wildcard subdomains are attached to the production Vercel project, set the production app URL to HTTPS, and verify that tenant subdomains resolve to the same application. After deployment, check:

- `https://nuravahubstores.com/sitemap.xml`
- `https://nuravahubstores.com/robots.txt`
- one published tenant's `https://{store-slug}.nuravahubstores.com/` and a published product URL

In Google Search Console, verify a Domain property for `nuravahubstores.com` (including subdomains), submit `https://nuravahubstores.com/sitemap.xml`, then inspect the sitemap report and representative apex and tenant URLs. Live indexing and DNS are outside local verification.

## Local verification

- `npm run type-check`: passed.
- Focused ESLint on the changed SEO files: passed.
- `tests/seo/sitemap.test.ts`: 6 passed, covering fixed URLs, empty data, database failure, eligible store/product/category/article generation, hidden-category filtering, demo exclusions, and cache headers.
- `npm run build` with `PLATFORM_DOMAIN=nuravahubstores.com` supplied to the command: passed. Next emitted the sitemap index route and catch-all child sitemap route. Static prerender logged the unavailable Neon database; this did not fail the build.
- Local HTTP checks against the production build returned 200 for `/sitemap.xml`, `/sitemap/0.xml`, and `/robots.txt`. Both sitemap documents parsed as XML, the fixed child contained 13 HTTPS URLs on the target domain with no private/API/staging URLs, and the index pointed to one child when database counts were unavailable. `robots.txt` referenced the target sitemap. A query-string page emitted the clean canonical and matching Open Graph URL; `/auth/signin` emitted `noindex,nofollow`.
- The repository-wide `npm test` run before the final SEO-specific tests reported 166 passing and 6 failing tests. The failures were existing UI/source assertions, a missing `frontend/src/lib/demo-store-config` module imported by a test, and a tenant host test that attempted database-backed resolution. They were outside the sitemap implementation.
