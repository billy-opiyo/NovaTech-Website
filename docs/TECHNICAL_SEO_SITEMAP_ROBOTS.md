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

The requested canonical domain is `nuravahubstores.com`, and the source-level platform resolver defaults to it. The root `.env.production` now sets `PLATFORM_DOMAIN=nuravahubstores.com` and `NEXT_PUBLIC_APP_URL=https://nuravahubstores.com`. Other repository material still names `nuravatech.com` as the production domain, including `frontend/src/config/client.config.ts`, the DNS runbook, and architecture/user documentation. Those mismatches remain to reconcile. Live HTTP verification below confirms the apex and platform-owned store subdomain serve the app, although DNS records and Vercel project settings are not inspectable from this repository.

## Implementation

- `frontend/src/app/sitemap.xml/route.ts` serves the sitemap index at `/sitemap.xml`; `frontend/src/app/sitemap/[...file]/route.ts` serves child XML files, and `frontend/src/lib/sitemap.ts` builds the filtered entries. It splits child files at 45,000 URLs (15,000 storefronts, because each contributes three URLs). Entries cover published storefronts and their product/blog indexes, eligible products, active configured categories, and published platform or tenant blog posts. Entry URLs use HTTPS on the platform apex or `{storeSlug}.{platformDomain}`.
- Product and article entries use their reliable database `updatedAt` value. Storefront home entries use the store `updatedAt` value. Fixed pages and categories omit `lastmod` because the source has no reliable page/category modification timestamp.
- Sitemap responses use shared-cache headers for one hour with stale-while-revalidate. Database count errors return an index pointing to the fixed sitemap page; a page query error returns an empty child sitemap and logs the failure. Empty content counts produce only the fixed sitemap page.
- `frontend/src/app/robots.ts` allows page and asset crawling and references the production sitemap. Private/account/auth/checkout/onboarding pages use `noindex,nofollow` metadata so crawlers can fetch them and read the directive; robots.txt is not used as an access-control or indexing mechanism. API routes are not blanket-blocked.
- The root layout now emits canonical URLs on the configured apex or canonical store subdomain and removes query strings. It also applies `noindex,nofollow` to private/account/auth/checkout/onboarding paths. Sitemap and canonical output intentionally follow platform subdomains even when a verified custom domain resolves to the same tenant.

## Production follow-up

The fix is committed as `1b3e79d` on `main` and was confirmed live on 2026-11-28. No DNS or Vercel project settings were changed. Reconcile the repository's remaining `nuravatech.com` configuration and documentation with the production `nuravahubstores.com` domain. For future SEO changes, recheck:

- `https://nuravahubstores.com/sitemap.xml`
- `https://nuravahubstores.com/robots.txt`
- one published tenant's `https://{store-slug}.nuravahubstores.com/` and a published product URL

In Google Search Console, verify a Domain property for `nuravahubstores.com` (including subdomains), submit `https://nuravahubstores.com/sitemap.xml`, then inspect the sitemap report and representative apex and tenant URLs. Live indexing and DNS are outside local verification.

## Local verification

- `npm run type-check`: passed.
- Focused ESLint on the changed SEO files: passed.
- `tests/seo/sitemap.test.ts`: 6 passed, covering fixed URLs, empty data, database failure, eligible store/product/category/article generation, hidden-category filtering, demo exclusions, and cache headers.
- `npm run build` with the root production environment loaded: passed. Static prerender could not reach Neon from the build sandbox, but the runtime database-backed route was verified separately with the configured production environment.
- Local HTTP checks against the production build returned 200 for `/sitemap.xml`, `/sitemap/0.xml`, and `/robots.txt`. Both sitemap documents parsed as XML, the fixed child contained 13 HTTPS URLs on the target domain with no private/API/staging URLs, and the index pointed to one child when database counts were unavailable. `robots.txt` referenced the target sitemap. A query-string page emitted the clean canonical and matching Open Graph URL; `/auth/signin` emitted `noindex,nofollow`.
- The repository-wide `npm test` run before the final SEO-specific tests reported 166 passing and 6 failing tests. The failures were existing UI/source assertions, a missing `frontend/src/lib/demo-store-config` module imported by a test, and a tenant host test that attempted database-backed resolution. They were outside the sitemap implementation.

## Live production verification (2026-11-27)

- A read-only Prisma connection using the root `.env.production` succeeded. The database contains 2 stores, 0 products, 0 blog posts, and 16 categories. The sitemap publishes one eligible store (the three store URLs in its own child sitemap); the other database store is not included by the public-store rules.
- `https://nuravahubstores.com/sitemap.xml`, all three linked children, and `/robots.txt` returned HTTP 200. All XML parsed successfully. The child files contain 13 fixed platform URLs, 3 `nurava-marketplace` URLs, and 16 `nurava-marketplace` category URLs (32 total). No demo-store, private, API, product, or article URLs were present; the database currently has no products or posts to publish.
- At the time of the live audit, all 32 sitemap URLs returned HTTP 200. Canonicals matched except `/deals`, which returned a production 307 redirect to `/stores?all=1`; the destination canonical is `/stores`. The follow-up source fix below removes that redirecting URL.
- Production `robots.txt` returned `text/plain`, allows `/`, and names `https://nuravahubstores.com/sitemap.xml`. Private auth pages return `noindex,nofollow`; no sitemap URLs were marked noindex.
- Repeated production sitemap requests returned `X-Vercel-Cache: HIT` with increasing `Age`, confirming the responses are cached at the edge. This was the initial audit, before the follow-up fix.

## Post-fix production verification (2026-11-28)

- Commit `1b3e79d` was pushed to `main` and auto-deployed. A cache-busted request returned three valid sitemap children with 12 fixed platform URLs, 3 platform-store URLs, and 16 category URLs (31 total); `/deals` is absent.
- All 31 listed URLs returned HTTP 200, had matching canonicals, and were indexable. No API, private, or demo-store URLs appeared.
- Production `/robots.txt` returned HTTP 200, allows `/`, and references the production sitemap. `/auth/signin` remained `noindex,nofollow`.
