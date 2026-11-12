# Multi-Industry Commerce Audit and Migration Report

Status: Initial architecture audit and implementation report; current positioning and deployment status are updated below.

Current integration branch: `saas-staging`

## Executive summary

Nurava HubStores is a multi-industry commerce platform for diverse independent stores. Merchants configure separate storefronts, categories, themes, and product attributes for their businesses; the platform's general positioning does not enumerate the store types it hosts. The architecture supports tenant-scoped commerce, industry configuration, and store-specific discovery. The legacy Nurava Tech demo-store catalog and its electronics defaults remain as compatibility data, not as a limit on the platform's scope.

The safest conversion is additive. Existing `Product.specs`, electronics categories, store JSON settings, orders, users, and tenant records remain valid. New industry, theme, attribute-definition, and product-attribute-value records are introduced alongside the current fields. The existing electronics store is assigned the seeded Electronics configuration and continues to use its current content/settings as overrides. New stores select an industry and receive a snapshot of its categories, attribute definitions, theme, and homepage defaults.

## Original pre-migration architecture findings (historical baseline)

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
- `frontend/src/config/client.config.ts` historically hardcoded the platform brand and electronics-specific SEO copy, navigation, hero copy, category cards, featured products, and contact/content defaults.
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

## Current implementation and deployment status

The multi-industry source changes are integrated into `saas-staging`. Onboarding supports industry selection; platform-protected controls manage industries, themes, categories, and attribute definitions; merchant catalogs and storefront defaults are resolved from each store's configuration. Legacy product specifications and the original Nurava Tech catalog remain supported for compatibility.

Migrations `0034_multi_industry_commerce` and `0035_industry_order_customizations` were deployed to the dedicated Neon database for this staging branch, `nuravatech-saas-staging`. No migration, database push, seed, or credential change was performed for this documentation and copy update.

Public platform positioning is industry-neutral. Platform pages describe Nurava HubStores as a multi-industry platform for diverse stores and do not enumerate the types of businesses it hosts. Industry names remain visible where needed for actual onboarding, store discovery, or platform administration.

Earlier verification results recorded below are historical snapshots, not evidence of the current staging deployment or browser rendering. Authenticated visual/browser verification and live Vercel runtime behavior must be checked separately.

Known follow-up: industry attribute definitions remain shared at industry level rather than being versioned/snapshotted per store. Changes by a platform administrator therefore affect active stores using that industry. Add per-store schema version snapshots/audit history before offering frequent in-place schema edits. Also retain a production rehearsal and a reviewed reverse-order rollback procedure as release gates.

## Continuation: discovery, storefront presets, and order compatibility

The branch continuation adds platform discovery filters by industry to the available, most-reviewed, and top-rated store groups. Development demo tenants have their own store routes; their records are defined in the development seed. No seed command was run as part of this documentation update.

Industry homepage presets support distinct hero copy, artwork, and palettes. Shared glass styling remains in place, with theme-aware text contrast. Industry-specific order inputs are validated and carried through cart, checkout/enquiry, and order-item snapshots without changing authoritative product prices, inventory, payment, shipping, or delivery calculations. Store category availability is resolved from the selected store's categories. Existing plan rows are not overwritten by development seeding, preserving prices and entitlements controlled by the platform owner.

The platform owner controls which configured industries are active for new-store onboarding from the platform industry dashboard. This changes availability only; it does not remove existing stores.

The initial feature-branch verification and database-safety notes above describe an earlier point in the rollout. The two industry migrations have since been applied to the dedicated staging Neon database noted above. Source checks and automated tests do not substitute for authenticated browser QA or visual confirmation of the deployed Vercel experience.
