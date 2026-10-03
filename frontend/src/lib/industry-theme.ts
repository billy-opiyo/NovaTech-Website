import { DEFAULT_THEME_PRESET, THEME_PRESETS, type ThemePresetId } from "../config/theme-presets"
import { clientConfig } from "../config/client.config"

type ThemeLike = { colors: unknown; typography: unknown } | null | undefined

const record = (value: unknown): Record<string, unknown> =>
	value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}

export function themeOverridesFromIndustry(theme: ThemeLike, fallbackPresetId: ThemePresetId = clientConfig.themePreset) {
	if (!theme) return undefined
	const colors = record(theme.colors)
	const typography = record(theme.typography)
	const colorValue = (key: string) => typeof colors[key] === "string" && /^#[0-9a-f]{6}$/i.test(colors[key] as string) ? colors[key] as string : undefined
	const fallbackPreset = THEME_PRESETS[fallbackPresetId] || THEME_PRESETS[DEFAULT_THEME_PRESET]
	const lightPalette = {
		...(colorValue("background") ? { background: colorValue("background") } : {}),
		...(colorValue("surface") ? { surface: colorValue("surface") } : {}),
		...(colorValue("text") ? { text: colorValue("text") } : {}),
		...(colorValue("muted") ? { muted: colorValue("muted") } : {}),
		...(colorValue("border") ? { border: colorValue("border") } : {}),
	}
	const darkPalette = {
		background: colorValue("darkBackground") || fallbackPreset.dark.background,
		surface: colorValue("darkSurface") || fallbackPreset.dark.surface,
		text: colorValue("darkText") || fallbackPreset.dark.text,
		muted: colorValue("darkMuted") || fallbackPreset.dark.muted,
		border: colorValue("darkBorder") || fallbackPreset.dark.border,
	}
	const allowedFonts = new Set(["system", "inter", "georgia", "trebuchet", "verdana"])
	const bodyFont = typeof typography.body === "string" && allowedFonts.has(typography.body) ? typography.body : undefined
	const headingFont = typeof typography.heading === "string" && allowedFonts.has(typography.heading) ? typography.heading : undefined
	return {
		colors: {
			...(colorValue("primary") ? { primary: colorValue("primary") } : {}),
			...(colorValue("primaryLight") ? { primaryLight: colorValue("primaryLight") } : {}),
			...(colorValue("primaryDark") ? { primaryDark: colorValue("primaryDark") } : {}),
			...(colorValue("accent") ? { accent: colorValue("accent") } : {}),
			light: lightPalette,
			dark: darkPalette,
		},
		...(bodyFont || headingFont ? { typography: { ...(bodyFont ? { bodyFont } : {}), ...(headingFont ? { headingFont } : {}) } } : {}),
	}
}
