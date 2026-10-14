# Multi-Industry Commerce Audit and Migration Report

Status: Phase 1 audit completed before application changes

Branch: `multi-industry-commerce`

## Executive summary

The platform already has a strong tenant foundation: `Tenant`, `Store`, `Membership`, scoped commerce records, store/domain resolution, store settings drafts, published settings versions, and permission checks. The catalog and storefront are not yet industry-agnostic. Electronics behavior is currently supplied by developer-owned defaults and client configuration, while product specifications are stored as an untyped JSON object and rendered through a fixed electronics product editor.

The safest conversion is additive. Existing `Product.specs`, electronics categories, store JSON settings, orders, users, and tenant records remain valid. New industry, theme, attribute-definition, and product-attribute-value records are introduced alongside the current fields. The existing electronics store is assigned the seeded Electronics configuration and continues to use its current content/settings as overrides. New stores select an industry and receive a snapshot of its categories, attribute definitions, theme, and homepage defaults.

## Current architecture findings

### Tenant and store boundary

- `Tenant` is the merchant boundary and `Store` is currently one-to-one with a tenant (`backend/prisma/schema.prisma`, `Store` model).
- Most commerce records already carry `tenantId`, including categories, products, variants, carts, orders, payments, customers-related records, reviews, and inventory-related records.
- Request resolution is centralized in `backend/lib/tenant.ts` and store permissions in `backend/lib/tenant-access.ts` / `backend/lib/store-access.ts`.
- Public store context is assembled by `frontend/src/lib/store-context.server.ts`; it merges store JSON settings over `frontend/src/config/client.config.ts`.
- The current design is tenant-safe only when every query retains its tenant/store predicate. New APIs must use the same access helpers and must validate that referenced categories, products, definitions, and themes belong to the resolved industry/store scope.

### Electronics-specific models and fields

- `Category` is tenant-scoped but has no industry/store ownership and no industry relation.
- `Product` has generic commerce fields but also electronics-oriented `brand`, `warranty`, `weight`, `dimensions`, and comments/examples for CPU/RAM specifications.
- `Product.specs Json?` is flexible but untyped and has no definition, validation, type, option, or display-order metadata.
- `Variant.name/value` comments use electronics examples such as Storage and RAM, but the model itself can remain generic.
- The existing product editor (`frontend/src/components/manage/ManageProductsPage.tsx`) requires `brand`, exposes `warranty`, and edits specifications as free-form `key=value` lines.
- The seed (`backend/prisma/seed.ts`) creates Nurava Tech electronics categories/products and electronics specifications. These records must be preserved.

### Electronics-specific categories and defaults

- `backend/lib/default-categories.ts` exports only Phones, Laptops, Tablets, Accessories, and Gaming.
- `frontend/src/config/client.config.ts` hardcodes the Nurava Tech brand, electronics SEO copy, navigation, hero copy, category cards, featured products, and electronics contact/content defaults.
- The onboarding route (`frontend/src/app/api/onboarding/store/route.ts`) always copies `DEFAULT_STORE_CATEGORIES` and accepts no industry selection.
- The onboarding UI (`frontend/src/app/onboarding/page.tsx`) has no industry step.

### Electronics-specific wording/navigation/storefront

- `client.config.ts` contains “electronics”, “phones”, “laptops”, “accessories”, and “Upgrade Your Tech” defaults.
- `ManageProductsPage.tsx` says “Manage your electronics catalog” and “Specifications” uses a free-form electronics-oriented input.
- Home components are structurally reusable, but hero/category/featured copy comes from the electronics client config and does not have a persisted, industry-owned preset.
- `store-context.server.ts` filters navigation/categories from `clientConfig`, which means a new industry currently inherits electronics navigation and cards unless its JSON settings manually replaces them.
- Theme presets (`frontend/src/config/theme-presets.ts`) are compile-time TypeScript constants; they are not database `Theme` entities and cannot be created from an admin dashboard.

### Existing configurable capabilities to retain

- Store JSON fields already exist for theme, SEO, contact, homepage, commerce, and draft settings.
- Store settings have versioning and rollback routes. The new industry defaults should be copied into store settings as a snapshot so later industry edits do not unexpectedly mutate existing merchant storefronts.
- Existing product images, pricing, stock, featured/new/trending flags, checkout, payments, orders, reviews, and delivery behavior are independent of electronics and should remain unchanged.

## Target architecture

The platform will use one commerce engine with configuration data:

```text
Industry 1---* IndustryCategoryTemplate
Industry 1---* ProductAttributeDefinition
Industry *---1 Theme (default)
Industry 1---* Store
Store 1---* Category
Product *---1 Category
Product 1---* ProductAttributeValue
ProductAttributeDefinition 1---* ProductAttributeValue
```

Core additions:

- `Industry`: name, unique slug, description, icon, active flag, default theme, homepage preset/configuration, timestamps.
- `Theme`: name, unique slug, colors/typography/layout JSON, active flag, timestamps.
- `IndustryCategoryTemplate`: default category name/slug/description/image/order and active flag.
- `ProductAttributeDefinition`: industry-owned name/key/type/options/required/display order/active flag.
- `Store.industryId`: the selected industry for a merchant store.
- `Category.storeId`: store-owned categories, with a compatibility backfill from current tenant categories.
- `ProductAttributeValue`: typed value JSON plus denormalized display value, scoped through product and definition.

Supported attribute types are represented as a Prisma enum: `TEXT`, `NUMBER`, `BOOLEAN`, `DROPDOWN`, and `MULTI_SELECT`. Values are validated server-side against the definition and options; the API never trusts client-supplied definition IDs without checking the resolved store's industry.

## Compatibility and data preservation

1. Add nullable `Store.industryId`, nullable `Category.storeId`, and the new tables.
2. Insert the Electronics industry, its theme, category templates, and attribute definitions.
3. Assign every existing store to Electronics; assign existing categories to their store using the tenant/store relation.
4. Keep `Product.specs` and legacy fields during the compatibility period. Existing electronics product forms/API payloads continue to work; the new attribute values are additive.
5. Copy electronics defaults only when a store has no explicit homepage/navigation/theme override. Existing Nurava Tech settings remain the source of truth for that store.
6. New stores select an industry and receive copied categories, definitions, theme, and homepage configuration in one transaction.
7. Do not delete or rename current category/product/order/user columns in the first migration.

Rollback is schema-safe: stop using new APIs, restore the previous application revision, and leave additive tables/columns in place. If a full database rollback is required, export the new rows, remove the new foreign-key/index objects in reverse order, then drop only the new tables/columns after verifying no legacy record depends on them. No destructive rollback should run automatically in production.

## Security and tenant-isolation requirements

- Every merchant mutation resolves the request store, checks membership permission, and includes both `tenantId` and `storeId` in the query where both are available.
- Attribute definitions are read through `store.industryId`; a merchant cannot submit an attribute definition from another industry.
- Product attribute values are written in a transaction with product/store/tenant and definition/industry consistency checks.
- Public catalog queries use the resolved store and never use a global product/category lookup by slug alone.
- Platform industry/theme CRUD is restricted to platform roles; disabling an industry prevents new store creation but does not break existing stores.
- New tests must cover two tenants with similarly named categories/products, cross-tenant IDs, cross-industry definition IDs, disabled industries, and onboarding snapshots.

## Migration risks

- Existing categories are tenant-scoped rather than store-scoped. The backfill must use each tenant's unique `Store` and must fail loudly if an orphaned tenant/category is found.
- `Store.slug` is globally unique and is used by request routing; industry onboarding must not alter existing slugs.
- The current settings merge casts persisted JSON into `StoreContext` after partial validation. New industry defaults need explicit runtime schemas and must not rely on TypeScript casts for security decisions.
- `brand`, `warranty`, and legacy `specs` are used by existing product APIs/tests. They should become optional for generic stores only after validators and UI compatibility are updated.
- Compile-time theme IDs cannot satisfy dashboard-created themes. Database themes should be accepted by store settings while compile-time presets remain as a fallback for legacy stores.

## Implementation sequence

1. Add schema models/enums and an additive migration with backfill/constraints.
2. Add typed industry/theme preset service and seed Electronics, Furniture, and Cake Shop configurations idempotently.
3. Update onboarding API/UI to select an active industry and snapshot its defaults.
4. Add platform industry/theme/attribute-definition CRUD with authorization and validation.
5. Add merchant category/attribute-definition reads and a dynamic product form while preserving legacy electronics fields.
6. Replace storefront hardcoded copy/navigation/category sources with store snapshot configuration, retaining Nurava overrides.
7. Add cross-tenant/cross-industry tests, Prisma validation, typecheck, lint, and focused application tests.
8. Perform a production migration rehearsal and document rollback/verification evidence.

## Technical debt identified

- `StoreContext` currently ends with a broad `as unknown as StoreContext` cast because the persisted JSON shape is not fully modeled.
- The product `specs` JSON contract is not shared between frontend and backend.
- Default electronics configuration is duplicated between `default-categories.ts`, `client.config.ts`, and `seed.ts`.
- Theme metadata is developer-managed and duplicated between runtime CSS variables and database store settings.
- Tenant-scoped tables with nullable tenant IDs require continued auditing so public/global records cannot be accidentally exposed.

## Scalability recommendations

- Keep industry presets immutable/versioned and snapshot them into stores; add explicit preset version IDs when editing becomes frequent.
- Introduce a shared `StoreScope` query helper for every catalog/order/customer service rather than relying on convention.
- Use JSONB only for flexible presentation/value payloads; keep searchable product attributes denormalized or indexed when filtering is introduced.
- Add Postgres row-level security only after the application scope is complete and connection/session propagation is designed for Neon pooling.
- Add audit logs for industry/theme/attribute changes and publish workflows.
- Add cache invalidation keyed by store and configuration version for public storefronts.

## Implementation status and local verification

Status: Implementation is present in the working tree on `multi-industry-commerce`; no commit or push has been made.

The additive Prisma schema and migration are implemented in `backend/prisma/schema.prisma` and `backend/prisma/migrations/0034_multi_industry_commerce/migration.sql`. The migration introduces the industry, theme, category-template, store-type, and typed product-attribute models; assigns existing stores/categories/products to their store/industry; and copies recognized legacy electronics specifications into typed values without dropping or rewriting `Product.specs`. Electronics, Furniture, and Cake Shop configurations are seeded in the migration. Existing Nurava seed behavior is retained and its records now carry explicit store ownership.

Industry selection and default snapshots are wired into onboarding. Platform-protected APIs and the platform dashboard manage industries, themes, categories, and attribute definitions. Merchant product entry and product details use industry-defined typed attributes, while legacy specs remain supported. Storefront navigation, category cards, hero/featured/banner content, and theme defaults now use store/industry configuration with the existing electronics configuration retained as a compatibility fallback.

Database safety boundary: the migration has **not** been applied. No Prisma migration, `db push`, or database seed command has been run, and no `.env.local` or other environment credentials were read or used. Schema validation and Prisma client generation were performed offline with a disposable loopback schema-check URL. Apply this migration only after configuring the separate Neon database URL intended for this branch, reviewing the target explicitly, and taking the planned backup/rehearsal steps.

Local verification: combined frontend type-check and backend production build passed; Prisma schema validation passed; lint completed with 0 errors (91 warnings, predominantly existing warnings); and the full test suite passed (93/93). The suite includes mocked tenant-isolation checks; it also emits expected integration-test errors while confirming graceful handling of unavailable provider credentials and the unavailable local database. The migration has not received a live-database rehearsal, and database-backed cross-tenant integration tests remain outstanding until the branch-specific Neon database is configured.

Known follow-up: industry attribute definitions remain shared at industry level rather than being versioned/snapshotted per store. Changes by a platform administrator therefore affect active stores using that industry. Add per-store schema version snapshots/audit history before offering frequent in-place schema edits. Also retain a production rehearsal and a reviewed reverse-order rollback procedure as release gates.

## Continuation: discovery, storefront presets, and order compatibility

The branch continuation adds platform discovery filters by industry to the available, most-reviewed, and top-rated store groups. The two development demo tenants are titled **Nurava Furnitures** and **Nurava Cakes** and use their own store routes; the existing Nurava Tech entry remains available. Demo tenant/catalog records are defined in the development seed and have not been inserted into any database.

Furniture and cake homepage presets now include distinct hero copy, imagery, non-empty category artwork, and palettes (beige/cream/walnut for furniture; chocolate/cream for cakes). Shared glass styling remains in place, with theme-aware text contrast. Industry-specific order input is limited to cake customizations; those choices are validated and carried through cart, checkout/enquiry, and order-item snapshots without changing authoritative product prices, inventory, payment, shipping, or delivery calculations. Store category availability is resolved from the selected store's categories rather than an electronics-only list. Existing plan rows are not overwritten by the development seed, preserving prices and entitlements controlled by the platform owner.

The Beauty industry is intentionally absent from initial presets and platform/onboarding records. The platform owner can control which configured industries are active for new-store onboarding from the platform industry dashboard. This changes availability only; it does not remove existing stores.

The branch-specific Neon URL is intentionally not configured or inspected here. The only schema check used a disposable loopback URL and passed. No migration, database push, or seed was run; migrations `0034_multi_industry_commerce` and `0035_industry_order_customizations` remain unapplied migration files pending explicit review against the separate Neon database for this branch. Fresh local verification passed: Prisma schema validation, combined frontend type-check/backend build, lint (0 errors; 93 warnings), and all 96 tests. Database-backed payment webhook tests log expected localhost-unavailable errors while validating graceful handling; no branch Neon database was contacted. These checks do not constitute a live database rehearsal or visual browser QA.
