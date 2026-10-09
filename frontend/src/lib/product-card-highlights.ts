type ProductAttributeHighlight = {
	displayValue?: string | null
	value?: unknown
	definition?: { name?: string | null }
}

export type ProductCardHighlight = { label: string; value: string }

function formatAttributeValue(attribute: ProductAttributeHighlight): string | null {
	if (typeof attribute.displayValue === "string" && attribute.displayValue.trim()) return attribute.displayValue.trim()
	const value = attribute.value
	if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value)
	if (Array.isArray(value)) {
		const entries = value.filter((entry): entry is string | number | boolean => ["string", "number", "boolean"].includes(typeof entry))
		return entries.length ? entries.map(String).join(", ") : null
	}
	return null
}

export function getProductCardHighlights(
	industrySlug: string | null | undefined,
	specs?: Record<string, unknown> | null,
	attributes?: ProductAttributeHighlight[] | null,
): ProductCardHighlight[] {
	if (industrySlug === "electronics") {
		return Object.entries(specs || {})
			.filter(([, value]) => value !== null && value !== undefined && String(value).trim())
			.slice(0, 3)
			.map(([label, value]) => ({ label, value: String(value) }))
	}

	return (attributes || [])
		.flatMap((attribute) => {
			const label = attribute.definition?.name?.trim()
			const value = formatAttributeValue(attribute)
			return label && value ? [{ label, value }] : []
		})
		.slice(0, 3)
}
