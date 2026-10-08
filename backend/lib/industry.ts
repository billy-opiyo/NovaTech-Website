import { ProductAttributeType, Prisma } from "@prisma/client"
import prisma from "./db"

export type IndustryAttributeInput = {
	definitionId: string
	value: unknown
}

export type NormalizedAttributeValue = {
	value: Prisma.InputJsonValue
	displayValue: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asDisplayValue(value: string | number | boolean | string[]): string {
	return Array.isArray(value) ? value.join(", ") : String(value)
}

export function normalizeIndustryAttributeValue(
	definition: { type: ProductAttributeType; options: string[] },
	input: unknown,
): NormalizedAttributeValue {
	if (definition.type === ProductAttributeType.TEXT) {
		if (typeof input !== "string" || !input.trim() || input.length > 500) throw new Error("Text attribute values must be non-empty and under 500 characters")
		const value = input.trim()
		return { value, displayValue: value }
	}

	if (definition.type === ProductAttributeType.NUMBER) {
		const value = typeof input === "number" ? input : typeof input === "string" && input.trim() ? Number(input) : Number.NaN
		if (!Number.isFinite(value)) throw new Error("Number attribute values must be valid numbers")
		return { value, displayValue: String(value) }
	}

	if (definition.type === ProductAttributeType.BOOLEAN) {
		const value = typeof input === "boolean" ? input : input === "true" ? true : input === "false" ? false : null
		if (value === null) throw new Error("Boolean attribute values must be true or false")
		return { value, displayValue: value ? "Yes" : "No" }
	}

	if (definition.type === ProductAttributeType.DROPDOWN) {
		if (typeof input !== "string" || !definition.options.includes(input)) throw new Error("Choose a valid dropdown option")
		return { value: input, displayValue: input }
	}

	if (!Array.isArray(input) || input.length === 0 || input.some((item) => typeof item !== "string" || !definition.options.includes(item))) {
		throw new Error("Choose one or more valid options")
	}
	const value = Array.from(new Set(input))
	return { value, displayValue: asDisplayValue(value) }
}

export function parseIndustryAttributeInputs(input: unknown): IndustryAttributeInput[] {
	if (input === undefined || input === null) return []
	if (!Array.isArray(input)) throw new Error("Attributes must be an array")
	return input.map((item) => {
		if (!isRecord(item) || typeof item.definitionId !== "string" || !("value" in item)) throw new Error("Each attribute requires a definitionId and value")
		return { definitionId: item.definitionId, value: item.value }
	})
}

export function normalizeIndustryAttributeInputs(
	definitions: readonly { id: string; name: string; type: ProductAttributeType; options: string[]; required: boolean }[],
	input: unknown,
) {
	const inputs = parseIndustryAttributeInputs(input)
	const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]))
	const seen = new Set<string>()
	const values = inputs.map((attribute) => {
		if (seen.has(attribute.definitionId)) throw new Error("Each product attribute may be supplied only once")
		seen.add(attribute.definitionId)
		const definition = definitionsById.get(attribute.definitionId)
		if (!definition) throw new Error("That product attribute is not available for this store")
		return { definitionId: definition.id, ...normalizeIndustryAttributeValue(definition, attribute.value) }
	})
	for (const definition of definitions) {
		if (definition.required && !seen.has(definition.id)) throw new Error(`The ${definition.name} attribute is required`)
	}
	return values
}

export function normalizeIndustryAttributeRecord(
	definitions: readonly { id: string; key: string; name: string; type: ProductAttributeType; options: string[]; required: boolean }[],
	input: unknown,
) {
	if (!isRecord(input)) throw new Error("Industry attributes must be a JSON object")
	const definitionsByKey = new Map(definitions.map((definition) => [definition.key, definition]))
	const values = Object.entries(input).map(([key, value]) => {
		const definition = definitionsByKey.get(key)
		if (!definition) throw new Error(`Unknown industry attribute '${key}'`)
		return { definitionId: definition.id, value }
	})
	return normalizeIndustryAttributeInputs(definitions, values)
}

export async function getStoreIndustry(storeId: string, tenantId: string) {
	return prisma.store.findFirst({
		where: { id: storeId, tenantId },
		select: {
			id: true,
			tenantId: true,
			industry: {
				include: {
					defaultTheme: true,
					attributeDefinitions: { where: { active: true }, orderBy: { displayOrder: "asc" } },
					categoryTemplates: { where: { active: true }, orderBy: { displayOrder: "asc" } },
				},
			},
		},
	})
}

export async function validateAndNormalizeProductAttributes(
	storeId: string,
	tenantId: string,
	input: unknown,
) {
	const store = await getStoreIndustry(storeId, tenantId)
	if (!store?.industry) throw new Error("This store has no active industry configuration")
	return normalizeIndustryAttributeInputs(store.industry.attributeDefinitions, input)
}
