export type CategoryTemplate = { id: string; name: string; slug: string; description: string | null; displayOrder: number; active: boolean }
export type AttributeDefinition = { id: string; name: string; key: string; type: string; required: boolean; options: string[]; active: boolean }
export type Theme = { id: string; name: string; slug: string; active: boolean; colors: Record<string, string>; typography: Record<string, string>; industryId?: string | null }
export type Industry = { id: string; name: string; slug: string; description: string | null; icon: string | null; active: boolean; homepagePreset?: Record<string, unknown>; categoryTemplates: CategoryTemplate[]; attributeDefinitions: AttributeDefinition[]; defaultTheme: Theme | null; themes: Theme[]; _count: { stores: number } }

export const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}

function stringRecord(value: unknown): Record<string, string> {
	return Object.fromEntries(Object.entries(asRecord(value)).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
}

export function normalizeTheme(value: unknown): Theme | null {
	const theme = asRecord(value)
	if (typeof theme.id !== "string" || typeof theme.name !== "string" || typeof theme.slug !== "string") return null
	return {
		id: theme.id,
		name: theme.name,
		slug: theme.slug,
		active: theme.active === true,
		colors: stringRecord(theme.colors),
		typography: stringRecord(theme.typography),
		...(typeof theme.industryId === "string" || theme.industryId === null ? { industryId: theme.industryId } : {}),
	}
}

export function normalizeIndustry(value: unknown): Industry | null {
	const industry = asRecord(value)
	if (typeof industry.id !== "string" || typeof industry.name !== "string" || typeof industry.slug !== "string") return null
	const categoryTemplates = Array.isArray(industry.categoryTemplates) ? industry.categoryTemplates.flatMap((value): CategoryTemplate[] => {
		const category = asRecord(value)
		return typeof category.id === "string" && typeof category.name === "string" && typeof category.slug === "string"
			? [{ id: category.id, name: category.name, slug: category.slug, description: typeof category.description === "string" ? category.description : null, displayOrder: typeof category.displayOrder === "number" ? category.displayOrder : 0, active: category.active !== false }]
			: []
	}) : []
	const attributeDefinitions = Array.isArray(industry.attributeDefinitions) ? industry.attributeDefinitions.flatMap((value): AttributeDefinition[] => {
		const attribute = asRecord(value)
		return typeof attribute.id === "string" && typeof attribute.name === "string" && typeof attribute.key === "string"
			? [{ id: attribute.id, name: attribute.name, key: attribute.key, type: typeof attribute.type === "string" ? attribute.type : "TEXT", required: attribute.required === true, options: Array.isArray(attribute.options) ? attribute.options.filter((option): option is string => typeof option === "string") : [], active: attribute.active !== false }]
			: []
	}) : []
	const count = asRecord(industry._count).stores
	return {
		id: industry.id,
		name: industry.name,
		slug: industry.slug,
		description: typeof industry.description === "string" ? industry.description : null,
		icon: typeof industry.icon === "string" ? industry.icon : null,
		active: industry.active === true,
		homepagePreset: asRecord(industry.homepagePreset),
		categoryTemplates,
		attributeDefinitions,
		defaultTheme: normalizeTheme(industry.defaultTheme),
		themes: Array.isArray(industry.themes) ? industry.themes.map(normalizeTheme).filter((theme): theme is Theme => theme !== null) : [],
		_count: { stores: typeof count === "number" && Number.isFinite(count) ? count : 0 },
	}
}

export function normalizeIndustries(value: unknown): Industry[] {
	return Array.isArray(value) ? value.map(normalizeIndustry).filter((industry): industry is Industry => industry !== null) : []
}

export function normalizeThemes(value: unknown): Theme[] {
	return Array.isArray(value) ? value.map(normalizeTheme).filter((theme): theme is Theme => theme !== null) : []
}
