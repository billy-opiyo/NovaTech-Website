export type ProductAttribute = {
	definition?: { name?: string | null; key?: string | null }
	displayValue?: string | null
	value?: unknown
}

export function getProductSpecsWithAttributes(specs: Record<string, unknown> | null | undefined, attributes: ProductAttribute[] = []) {
	const merged: Record<string, unknown> = { ...specs }
	for (const attribute of attributes) {
		const name = attribute.definition?.name?.trim()
		const key = attribute.definition?.key?.trim()
		const label = name || key
		if (!label || merged[label] !== undefined) continue
		merged[label] = attribute.displayValue || (typeof attribute.value === "string" || typeof attribute.value === "number" || typeof attribute.value === "boolean" ? attribute.value : undefined)
	}
	return merged
}
