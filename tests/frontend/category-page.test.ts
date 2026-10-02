import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

test("category product loading is keyed by stable request URLs rather than refreshed store context", () => {
	const source = readFileSync("frontend/src/app/category/[slug]/page.tsx", "utf8")
	const effectStart = source.indexOf("useEffect(() => {")
	const effectEnd = source.indexOf("\n\tif (!category || !categoryIsEnabled)", effectStart)
	const productEffect = source.slice(effectStart, effectEnd)

	assert.ok(effectStart >= 0 && effectEnd > effectStart, "category product-loading effect should be present")
	assert.match(productEffect, /fetch\(catalogUrl/)
	assert.match(productEffect, /fetch\(trendingUrl/)
	assert.match(productEffect, /\}, \[category, slug, catalogUrl, trendingUrl\]\)/)
	assert.doesNotMatch(productEffect, /\[category, slug, store\]/)
	assert.match(productEffect, /if \(!controller\.signal\.aborted\) setLoadingProducts\(false\)/)
})
