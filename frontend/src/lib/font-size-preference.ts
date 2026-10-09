export const FONT_SIZE_OPTIONS = ["small", "normal", "large", "extraLarge"] as const
export type FontSizeOption = typeof FONT_SIZE_OPTIONS[number]
export type FontSizePreference = "site" | FontSizeOption

export const FONT_SIZE_CSS_VALUE: Record<FontSizeOption, string> = {
	small: "90%",
	normal: "100%",
	large: "110%",
	extraLarge: "120%",
}

export const FONT_SIZE_LABELS: Record<FontSizeOption, string> = {
	small: "Small (90%)",
	normal: "Normal (100%)",
	large: "Large (110%)",
	extraLarge: "Extra large (120%)",
}

export function isFontSizePreference(value: unknown): value is FontSizePreference {
	return value === "site" || (typeof value === "string" && FONT_SIZE_OPTIONS.some((option) => option === value))
}
