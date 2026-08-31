type VariantLike = {
	id?: string
	name: string
	value: string
	priceModifier?: number | null
	stock: number
}

export function resolveVariantSelection(variants: VariantLike[], selection?: string | null) {
	const tokens = (selection || "")
		.split(/\s*\/\s*/)
		.map((token) => token.trim())
		.filter(Boolean)
	if (!tokens.length) return { valid: true, selected: [] as VariantLike[], priceModifier: 0, stock: null as number | null }

	const selected: VariantLike[] = []
	for (const token of tokens) {
		const separator = token.indexOf(":")
		const name = separator >= 0 ? token.slice(0, separator).trim() : null
		const value = (separator >= 0 ? token.slice(separator + 1) : token).trim()
		const match = variants.find((variant) =>
			variant.value.trim().toLowerCase() === value.toLowerCase() &&
			(!name || variant.name.trim().toLowerCase() === name.toLowerCase()),
		)
		if (!match) return { valid: false, selected: [] as VariantLike[], priceModifier: 0, stock: 0 }
		if (selected.some((variant) => variant.name.trim().toLowerCase() === match.name.trim().toLowerCase())) {
			return { valid: false, selected: [] as VariantLike[], priceModifier: 0, stock: 0 }
		}
		selected.push(match)
	}

	return {
		valid: true,
		selected,
		priceModifier: selected.reduce((sum, variant) => sum + (variant.priceModifier || 0), 0),
		stock: Math.min(...selected.map((variant) => variant.stock)),
	}
}
