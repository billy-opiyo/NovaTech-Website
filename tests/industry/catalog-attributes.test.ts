import { test } from "node:test"
import assert from "node:assert/strict"
import { ProductAttributeType } from "@prisma/client"
import { csvCell, parseCsv } from "../../backend/lib/catalog-csv"
import { normalizeIndustryAttributeInputs, normalizeIndustryAttributeRecord } from "../../backend/lib/industry"

test("CSV JSON attribute cells round-trip typed industry values", () => {
	const attributes = { flavor: "Chocolate", weight: 1.5, servings: ["6 slices", "12 slices"] }
	const parsed = parseCsv(`name,attributes\nCelebration cake,${csvCell(attributes)}\n`)
	assert.deepEqual(JSON.parse(parsed[0].attributes), attributes)
})

test("catalog CSV cells neutralize spreadsheet formulas after leading control whitespace", () => {
	assert.equal(csvCell("=1+1"), "'=1+1")
	assert.equal(csvCell("+SUM(A1,A2)"), `"'+SUM(A1,A2)"`)
	assert.equal(csvCell("\t@SUM(A1)"), "'\t@SUM(A1)")
	assert.equal(csvCell("-5"), "'-5")
	assert.equal(csvCell("Regular product name"), "Regular product name")
})

test("industry attribute normalization enforces required values in bulk catalog operations", () => {
	const definitions = [
		{ id: "flavor-id", name: "Flavor", type: ProductAttributeType.DROPDOWN, options: ["Vanilla", "Chocolate"], required: true },
		{ id: "weight-id", name: "Weight", type: ProductAttributeType.NUMBER, options: [], required: false },
	]
	assert.deepEqual(normalizeIndustryAttributeInputs(definitions, [
		{ definitionId: "flavor-id", value: "Chocolate" },
		{ definitionId: "weight-id", value: "1.5" },
	]), [
		{ definitionId: "flavor-id", value: "Chocolate", displayValue: "Chocolate" },
		{ definitionId: "weight-id", value: 1.5, displayValue: "1.5" },
	])
	assert.throws(() => normalizeIndustryAttributeInputs(definitions, []), /Flavor attribute is required/)
	assert.throws(() => normalizeIndustryAttributeInputs(definitions, [{ definitionId: "flavor-id", value: "Strawberry" }]), /valid dropdown option/)
})

test("industry CSV attribute keys map to only the active store-industry definitions", () => {
	const definitions = [
		{ id: "flavor-id", key: "flavor", name: "Flavor", type: ProductAttributeType.DROPDOWN, options: ["Vanilla", "Chocolate"], required: true },
	]
	assert.deepEqual(normalizeIndustryAttributeRecord(definitions, { flavor: "Vanilla" }), [
		{ definitionId: "flavor-id", value: "Vanilla", displayValue: "Vanilla" },
	])
	assert.throws(() => normalizeIndustryAttributeRecord(definitions, { processor: "i7" }), /Unknown industry attribute/)
})
