import { test } from "node:test"
import assert from "node:assert/strict"
import { ProductAttributeType } from "@prisma/client"
import { normalizeIndustryAttributeValue, parseIndustryAttributeInputs } from "../../backend/lib/industry"
import { storeOnboardingSchema } from "../../backend/validators/storeValidator"

test("industry product attributes normalize supported value types", () => {
	assert.deepEqual(normalizeIndustryAttributeValue({ type: ProductAttributeType.TEXT, options: [] }, "  Oak  "), { value: "Oak", displayValue: "Oak" })
	assert.deepEqual(normalizeIndustryAttributeValue({ type: ProductAttributeType.NUMBER, options: [] }, "120"), { value: 120, displayValue: "120" })
	assert.deepEqual(normalizeIndustryAttributeValue({ type: ProductAttributeType.BOOLEAN, options: [] }, false), { value: false, displayValue: "No" })
	assert.deepEqual(normalizeIndustryAttributeValue({ type: ProductAttributeType.DROPDOWN, options: ["Vanilla", "Chocolate"] }, "Chocolate"), { value: "Chocolate", displayValue: "Chocolate" })
	assert.deepEqual(normalizeIndustryAttributeValue({ type: ProductAttributeType.MULTI_SELECT, options: ["Red", "Blue"] }, ["Red", "Blue", "Red"]), { value: ["Red", "Blue"], displayValue: "Red, Blue" })
})

test("industry product attributes reject invalid typed values and options", () => {
	assert.throws(() => normalizeIndustryAttributeValue({ type: ProductAttributeType.NUMBER, options: [] }, "wide"), /valid numbers/)
	assert.throws(() => normalizeIndustryAttributeValue({ type: ProductAttributeType.BOOLEAN, options: [] }, "yes"), /true or false/)
	assert.throws(() => normalizeIndustryAttributeValue({ type: ProductAttributeType.DROPDOWN, options: ["Vanilla"] }, "Chocolate"), /valid dropdown option/)
	assert.throws(() => normalizeIndustryAttributeValue({ type: ProductAttributeType.MULTI_SELECT, options: ["Red"] }, ["Green"]), /valid options/)
})

test("industry attribute payloads require definition IDs and values", () => {
	assert.deepEqual(parseIndustryAttributeInputs([{ definitionId: "definition-1", value: 12 }]), [{ definitionId: "definition-1", value: 12 }])
	assert.throws(() => parseIndustryAttributeInputs([{ definitionId: "definition-1" }]), /definitionId and value/)
	assert.throws(() => parseIndustryAttributeInputs({ definitionId: "definition-1", value: "Oak" }), /array/)
})

test("onboarding accepts explicit industries while preserving legacy electronics callers", () => {
	const common = { name: "Sample Store", acceptLegalTerms: true }
	assert.equal(storeOnboardingSchema.parse(common).industrySlug, "electronics")
	assert.equal(storeOnboardingSchema.parse({ ...common, industrySlug: "furniture" }).industrySlug, "furniture")
	assert.equal(storeOnboardingSchema.safeParse({ ...common, industrySlug: "Invalid Industry" }).success, false)
})
