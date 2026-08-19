# Client customization

The storefront has safe developer defaults plus database-backed store settings:

- `frontend/src/config/client.config.ts` contains fallback branding, content, contact details, navigation, SEO, commerce defaults, and feature flags.
- `frontend/src/config/theme-presets.ts` contains the reusable electronics-store visual systems.
- The active server-resolved `StoreContext` supplies published store branding, homepage content, contact details, map links, and theme settings when those values exist.

## Selling to a new client

1. Copy or replace the logo referenced by `brand.logo` and `brand.favicon`.
2. For a published merchant store, prefer the store design/settings workflow so the active `StoreContext` is the runtime source. This keeps the shared homepage layout while allowing store-specific hero copy, categories, featured products, testimonials, newsletter content, contact details, and map links.
3. Update `client.config.ts` only when changing the safe default or seeded NovaTech fallback, then set `themePreset` to one of the IDs exported in `theme-presets.ts` when a code-level preset change is intended.
4. Run `npx tsc --noEmit` from `frontend`, then run the repository test suite with `npm test`.
5. Use isolated client/staging environment variables for database, authentication, payments, storage, and email. Never put secrets in this config file.

The preset catalog remains intentionally controlled in source code, while published store settings are resolved per host. Public DNS/SSL and database migration deployment are still required before production multi-store behavior can be considered verified.
