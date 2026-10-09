import { test } from "node:test"
import assert from "node:assert/strict"
import { getProductCardHighlights } from "../../frontend/src/lib/product-card-highlights"

const legacyElectronicsSpecs = { Processor: "Core i7", RAM: "16GB", Camera: "48MP" }
const industryAttributes = [
	{ definition: { name: "Flavor" }, displayValue: "Chocolate" },
	{ definition: { name: "Dimensions" }, displayValue: "180 × 76 cm" },
	{ definition: { name: "Available sizes" }, value: ["S", "M", "L"] },
]

test("electronics cards retain legacy product specification highlights", () => {
	assert.deepEqual(getProductCardHighlights("electronics", legacyElectronicsSpecs), [
		{ label: "Processor", value: "Core i7" },
		{ label: "RAM", value: "16GB" },
		{ label: "Camera", value: "48MP" },
	])
})

test("cake, furniture, boutique, and unclassified cards never expose legacy electronics specs", () => {
	for (const industry of ["cakes", "furniture", "boutiques", null]) {
		assert.deepEqual(getProductCardHighlights(industry, legacyElectronicsSpecs), [])
	}
})

test("non-electronics cards use their product's industry attributes instead", () => {
	assert.deepEqual(getProductCardHighlights("cakes", legacyElectronicsSpecs, industryAttributes), [
		{ label: "Flavor", value: "Chocolate" },
		{ label: "Dimensions", value: "180 × 76 cm" },
		{ label: "Available sizes", value: "S, M, L" },
	])
})
