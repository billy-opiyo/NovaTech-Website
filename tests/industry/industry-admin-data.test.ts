import { test } from "node:test"
import assert from "node:assert/strict"
import { normalizeIndustries, normalizeThemes } from "../../frontend/src/lib/industry-admin-data"

test("industry admin payload normalization tolerates missing relations and malformed records", () => {
	const industries = normalizeIndustries([
		{ id: "electronics", name: "Electronics", slug: "electronics" },
		null,
		{ id: "bad", name: 42, slug: "bad" },
	])

	assert.equal(industries.length, 1)
	assert.equal(industries[0].name, "Electronics")
	assert.deepEqual(industries[0].categoryTemplates, [])
	assert.deepEqual(industries[0].attributeDefinitions, [])
	assert.equal(industries[0]._count.stores, 0)
	assert.equal(industries[0].defaultTheme, null)
	assert.deepEqual(industries[0].themes, [])
})

test("industry admin theme normalization safely filters invalid color and typography values", () => {
	assert.deepEqual(normalizeThemes([
		{ id: "theme-1", name: "Navy", slug: "navy", active: true, colors: { primary: "#123456", invalid: 7 }, typography: null },
		{ id: "bad", name: "Incomplete" },
	]), [{
		id: "theme-1",
		name: "Navy",
		slug: "navy",
		active: true,
		colors: { primary: "#123456" },
		typography: {},
	}])
})
