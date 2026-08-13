# Client customization

This storefront is configured from two developer-managed files:

- `frontend/src/config/client.config.ts` contains client branding, content, contact details, navigation, SEO, commerce defaults, and feature flags.
- `frontend/src/config/theme-presets.ts` contains the reusable electronics-store visual systems.

## Selling to a new client

1. Copy or replace the logo referenced by `brand.logo` and `brand.favicon`.
2. Update the `brand`, `site`, `contact`, `seo`, `social`, `homepage`, `ecommerce`, and `features` sections in `client.config.ts`.
3. Set `themePreset` to one of the IDs exported in `theme-presets.ts`.
4. Run `npx tsc --noEmit` from `frontend`, then run the repository test suite with `npm test`.
5. Use isolated client/staging environment variables for database, authentication, payments, storage, and email. Never put secrets in this config file.

The preset is intentionally selected in source code and there is no customer-facing theme editor. This keeps the available designs controlled by the site owner while avoiding page-by-page recoding.
