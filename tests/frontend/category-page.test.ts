import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

test("category catalog and trending cards are server-loaded from tenant-aware public cache", () => {
	const page = readFileSync("frontend/src/app/category/[slug]/page.tsx", "utf8")
	const client = readFileSync("frontend/src/app/category/[slug]/CategoryClient.tsx", "utf8")
	assert.match(page, /getStoreRequestTenantContext\(\)/)
	assert.match(page, /Promise\.all\([\s\S]*getCachedFilteredProducts\(latestQuery, context, \{ includeReviewDetails: false \}\)[\s\S]*getCachedFilteredProducts\(trendingQuery, context, \{ includeReviewDetails: false \}\)/)
	assert.match(page, /catalogProducts=\{catalogProducts\} trendingProducts=\{trendingProducts\}/)
	assert.doesNotMatch(client, /fetch\(catalogUrl|fetch\(trendingUrl|setLoadingProducts/)
})
