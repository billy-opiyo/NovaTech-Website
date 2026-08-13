/**
 * Developer-managed visual presets.
 *
 * Keep these presets free of client data. Client-specific branding belongs in
 * client.config.ts, while this file contains reusable electronics-store UI
 * systems that can be selected from that config.
 */

export type ThemeModeColors = {
	background: string
	surface: string
	text: string
	muted: string
	border: string
	glassBackground: string
	glassBorder: string
	glassShadow: string
	scrollbarTrack: string
	scrollbarThumb: string
	scrollbarThumbHover: string
}

export type ThemePreset = {
	id: string
	name: string
	description: string
	primary: string
	primaryDark: string
	accent: string
	light: ThemeModeColors
	dark: ThemeModeColors
	fontBody: string
	fontHeading: string
	cardRadius: string
}

const mode = (
	colors: Omit<ThemeModeColors, "glassBackground" | "glassBorder" | "glassShadow" | "scrollbarTrack" | "scrollbarThumb" | "scrollbarThumbHover"> & {
		glassBackground: string
		glassBorder: string
		glassShadow: string
		scrollbarTrack: string
		scrollbarThumb: string
		scrollbarThumbHover: string
	},
): ThemeModeColors => colors

export const THEME_PRESETS = {
	"nova-blue-orange": {
		id: "nova-blue-orange",
		name: "Nova Blue & Orange",
		description: "Trustworthy blue with a high-energy deals accent.",
		primary: "#0070f3",
		primaryDark: "#005bb5",
		accent: "#f97316",
		light: mode({ background: "#f8fafc", surface: "#ffffff", text: "#0f172a", muted: "#64748b", border: "#e2e8f0", glassBackground: "rgba(255, 255, 255, 0.68)", glassBorder: "rgba(148, 163, 184, 0.24)", glassShadow: "0 8px 32px rgba(31, 38, 135, 0.12)", scrollbarTrack: "rgba(148, 163, 184, 0.15)", scrollbarThumb: "rgba(0, 112, 243, 0.7)", scrollbarThumbHover: "rgba(0, 91, 181, 0.9)" }),
		dark: mode({ background: "#0f172a", surface: "#1e293b", text: "#e2e8f0", muted: "#94a3b8", border: "#334155", glassBackground: "rgba(0, 0, 0, 0.3)", glassBorder: "rgba(255, 255, 255, 0.1)", glassShadow: "0 8px 32px rgba(0, 0, 0, 0.4)", scrollbarTrack: "rgba(15, 23, 42, 0.8)", scrollbarThumb: "rgba(59, 130, 246, 0.75)", scrollbarThumbHover: "rgba(96, 165, 250, 0.95)" }),
		fontBody: "Inter, ui-sans-serif, system-ui, sans-serif",
		fontHeading: "Inter, ui-sans-serif, system-ui, sans-serif",
		cardRadius: "1rem",
	},
	"midnight-cyan": {
		id: "midnight-cyan",
		name: "Midnight Cyan",
		description: "A sleek dark-first palette for premium gadgets and gaming gear.",
		primary: "#06b6d4",
		primaryDark: "#0891b2",
		accent: "#a3e635",
		light: mode({ background: "#f0fdfa", surface: "#ffffff", text: "#083344", muted: "#5b7280", border: "#cdeff3", glassBackground: "rgba(255, 255, 255, 0.72)", glassBorder: "rgba(6, 182, 212, 0.18)", glassShadow: "0 8px 32px rgba(8, 145, 178, 0.14)", scrollbarTrack: "rgba(20, 184, 166, 0.12)", scrollbarThumb: "rgba(6, 182, 212, 0.72)", scrollbarThumbHover: "rgba(8, 145, 178, 0.95)" }),
		dark: mode({ background: "#071923", surface: "#0d2732", text: "#d5f5f7", muted: "#8db7bf", border: "#194451", glassBackground: "rgba(3, 20, 28, 0.68)", glassBorder: "rgba(103, 232, 249, 0.16)", glassShadow: "0 8px 32px rgba(0, 0, 0, 0.46)", scrollbarTrack: "rgba(7, 25, 35, 0.9)", scrollbarThumb: "rgba(34, 211, 238, 0.72)", scrollbarThumbHover: "rgba(103, 232, 249, 0.95)" }),
		fontBody: "Inter, ui-sans-serif, system-ui, sans-serif",
		fontHeading: "Space Grotesk, Inter, ui-sans-serif, sans-serif",
		cardRadius: "0.9rem",
	},
	"graphite-lime": {
		id: "graphite-lime",
		name: "Graphite Lime",
		description: "Bold charcoal, electric lime, and a modern technical feel.",
		primary: "#84cc16",
		primaryDark: "#65a30d",
		accent: "#facc15",
		light: mode({ background: "#f7fee7", surface: "#ffffff", text: "#1a2e05", muted: "#65735b", border: "#d9efb8", glassBackground: "rgba(255, 255, 255, 0.75)", glassBorder: "rgba(101, 163, 13, 0.2)", glassShadow: "0 8px 32px rgba(77, 124, 15, 0.14)", scrollbarTrack: "rgba(132, 204, 22, 0.12)", scrollbarThumb: "rgba(101, 163, 13, 0.72)", scrollbarThumbHover: "rgba(77, 124, 15, 0.95)" }),
		dark: mode({ background: "#111611", surface: "#1c2618", text: "#ecfccb", muted: "#9cae8d", border: "#35452d", glassBackground: "rgba(11, 17, 10, 0.7)", glassBorder: "rgba(190, 242, 100, 0.15)", glassShadow: "0 8px 32px rgba(0, 0, 0, 0.46)", scrollbarTrack: "rgba(17, 22, 17, 0.9)", scrollbarThumb: "rgba(163, 230, 53, 0.72)", scrollbarThumbHover: "rgba(190, 242, 100, 0.95)" }),
		fontBody: "Inter, ui-sans-serif, system-ui, sans-serif",
		fontHeading: "Manrope, Inter, ui-sans-serif, sans-serif",
		cardRadius: "0.75rem",
	},
	"royal-purple": {
		id: "royal-purple",
		name: "Royal Purple",
		description: "Confident violet and gold for premium lifestyle electronics.",
		primary: "#7c3aed",
		primaryDark: "#6d28d9",
		accent: "#f59e0b",
		light: mode({ background: "#faf5ff", surface: "#ffffff", text: "#24113f", muted: "#756687", border: "#eadcff", glassBackground: "rgba(255, 255, 255, 0.72)", glassBorder: "rgba(124, 58, 237, 0.18)", glassShadow: "0 8px 32px rgba(109, 40, 217, 0.14)", scrollbarTrack: "rgba(124, 58, 237, 0.11)", scrollbarThumb: "rgba(124, 58, 237, 0.72)", scrollbarThumbHover: "rgba(109, 40, 217, 0.95)" }),
		dark: mode({ background: "#171022", surface: "#26183a", text: "#f3e8ff", muted: "#b9a8ce", border: "#4a3269", glassBackground: "rgba(17, 10, 29, 0.7)", glassBorder: "rgba(216, 180, 254, 0.16)", glassShadow: "0 8px 32px rgba(0, 0, 0, 0.48)", scrollbarTrack: "rgba(23, 16, 34, 0.9)", scrollbarThumb: "rgba(167, 139, 250, 0.75)", scrollbarThumbHover: "rgba(196, 181, 253, 0.95)" }),
		fontBody: "DM Sans, Inter, ui-sans-serif, sans-serif",
		fontHeading: "Sora, DM Sans, sans-serif",
		cardRadius: "1.25rem",
	},
	"cyber-pink": {
		id: "cyber-pink",
		name: "Cyber Pink",
		description: "Expressive magenta and blue for youth-focused tech stores.",
		primary: "#db2777",
		primaryDark: "#be185d",
		accent: "#2563eb",
		light: mode({ background: "#fdf2f8", surface: "#ffffff", text: "#3b1028", muted: "#826579", border: "#f7cfe3", glassBackground: "rgba(255, 255, 255, 0.74)", glassBorder: "rgba(219, 39, 119, 0.18)", glassShadow: "0 8px 32px rgba(190, 24, 93, 0.13)", scrollbarTrack: "rgba(219, 39, 119, 0.11)", scrollbarThumb: "rgba(219, 39, 119, 0.72)", scrollbarThumbHover: "rgba(190, 24, 93, 0.95)" }),
		dark: mode({ background: "#210d1a", surface: "#351328", text: "#fce7f3", muted: "#c9a2b6", border: "#5b2141", glassBackground: "rgba(31, 9, 24, 0.7)", glassBorder: "rgba(249, 168, 212, 0.16)", glassShadow: "0 8px 32px rgba(0, 0, 0, 0.46)", scrollbarTrack: "rgba(33, 13, 26, 0.9)", scrollbarThumb: "rgba(244, 114, 182, 0.75)", scrollbarThumbHover: "rgba(249, 168, 212, 0.95)" }),
		fontBody: "Nunito Sans, Inter, sans-serif",
		fontHeading: "Outfit, Nunito Sans, sans-serif",
		cardRadius: "1.4rem",
	},
	"ocean-teal": {
		id: "ocean-teal",
		name: "Ocean Teal",
		description: "Calm teal and coral for approachable everyday electronics.",
		primary: "#0f766e",
		primaryDark: "#115e59",
		accent: "#f97316",
		light: mode({ background: "#f0fdfa", surface: "#ffffff", text: "#123330", muted: "#607a76", border: "#c8e9e5", glassBackground: "rgba(255, 255, 255, 0.73)", glassBorder: "rgba(15, 118, 110, 0.18)", glassShadow: "0 8px 32px rgba(15, 118, 110, 0.13)", scrollbarTrack: "rgba(15, 118, 110, 0.11)", scrollbarThumb: "rgba(13, 148, 136, 0.72)", scrollbarThumbHover: "rgba(15, 118, 110, 0.95)" }),
		dark: mode({ background: "#0b1e1d", surface: "#12302e", text: "#d5fbf5", muted: "#92bdb8", border: "#25524f", glassBackground: "rgba(6, 24, 23, 0.7)", glassBorder: "rgba(94, 234, 212, 0.16)", glassShadow: "0 8px 32px rgba(0, 0, 0, 0.45)", scrollbarTrack: "rgba(11, 30, 29, 0.9)", scrollbarThumb: "rgba(45, 212, 191, 0.75)", scrollbarThumbHover: "rgba(94, 234, 212, 0.95)" }),
		fontBody: "Lato, Inter, sans-serif",
		fontHeading: "Montserrat, Lato, sans-serif",
		cardRadius: "1rem",
	},
	"forest-amber": {
		id: "forest-amber",
		name: "Forest Amber",
		description: "Grounded green with warm amber highlights for trusted retail.",
		primary: "#15803d",
		primaryDark: "#166534",
		accent: "#d97706",
		light: mode({ background: "#f0fdf4", surface: "#ffffff", text: "#102a1a", muted: "#617567", border: "#ccebd5", glassBackground: "rgba(255, 255, 255, 0.74)", glassBorder: "rgba(21, 128, 61, 0.18)", glassShadow: "0 8px 32px rgba(21, 128, 61, 0.13)", scrollbarTrack: "rgba(21, 128, 61, 0.11)", scrollbarThumb: "rgba(22, 163, 74, 0.72)", scrollbarThumbHover: "rgba(21, 128, 61, 0.95)" }),
		dark: mode({ background: "#0c1b12", surface: "#173321", text: "#dcfce7", muted: "#9abea4", border: "#2b5739", glassBackground: "rgba(7, 20, 12, 0.7)", glassBorder: "rgba(134, 239, 172, 0.16)", glassShadow: "0 8px 32px rgba(0, 0, 0, 0.45)", scrollbarTrack: "rgba(12, 27, 18, 0.9)", scrollbarThumb: "rgba(74, 222, 128, 0.75)", scrollbarThumbHover: "rgba(134, 239, 172, 0.95)" }),
		fontBody: "Source Sans 3, Inter, sans-serif",
		fontHeading: "Plus Jakarta Sans, Source Sans 3, sans-serif",
		cardRadius: "0.85rem",
	},
	"slate-electric": {
		id: "slate-electric",
		name: "Slate Electric",
		description: "Professional slate and vivid blue for B2C or B2B technology.",
		primary: "#4f46e5",
		primaryDark: "#4338ca",
		accent: "#06b6d4",
		light: mode({ background: "#f8fafc", surface: "#ffffff", text: "#172554", muted: "#64748b", border: "#dbe4f0", glassBackground: "rgba(255, 255, 255, 0.72)", glassBorder: "rgba(79, 70, 229, 0.18)", glassShadow: "0 8px 32px rgba(67, 56, 202, 0.13)", scrollbarTrack: "rgba(79, 70, 229, 0.11)", scrollbarThumb: "rgba(79, 70, 229, 0.72)", scrollbarThumbHover: "rgba(67, 56, 202, 0.95)" }),
		dark: mode({ background: "#101528", surface: "#1b2540", text: "#e0e7ff", muted: "#a5b4d4", border: "#33436a", glassBackground: "rgba(10, 15, 32, 0.7)", glassBorder: "rgba(165, 180, 252, 0.16)", glassShadow: "0 8px 32px rgba(0, 0, 0, 0.46)", scrollbarTrack: "rgba(16, 21, 40, 0.9)", scrollbarThumb: "rgba(129, 140, 248, 0.75)", scrollbarThumbHover: "rgba(165, 180, 252, 0.95)" }),
		fontBody: "Roboto, Inter, sans-serif",
		fontHeading: "Roboto, Inter, sans-serif",
		cardRadius: "0.7rem",
	},
	"red-carbon": {
		id: "red-carbon",
		name: "Red Carbon",
		description: "High-contrast black and red for performance and gaming hardware.",
		primary: "#dc2626",
		primaryDark: "#b91c1c",
		accent: "#f59e0b",
		light: mode({ background: "#fafafa", surface: "#ffffff", text: "#1c1917", muted: "#78716c", border: "#e7e5e4", glassBackground: "rgba(255, 255, 255, 0.76)", glassBorder: "rgba(220, 38, 38, 0.18)", glassShadow: "0 8px 32px rgba(127, 29, 29, 0.13)", scrollbarTrack: "rgba(220, 38, 38, 0.11)", scrollbarThumb: "rgba(220, 38, 38, 0.72)", scrollbarThumbHover: "rgba(185, 28, 28, 0.95)" }),
		dark: mode({ background: "#130d0d", surface: "#241616", text: "#fef2f2", muted: "#c3a2a2", border: "#512727", glassBackground: "rgba(18, 7, 7, 0.72)", glassBorder: "rgba(252, 165, 165, 0.16)", glassShadow: "0 8px 32px rgba(0, 0, 0, 0.5)", scrollbarTrack: "rgba(19, 13, 13, 0.9)", scrollbarThumb: "rgba(248, 113, 113, 0.75)", scrollbarThumbHover: "rgba(252, 165, 165, 0.95)" }),
		fontBody: "Barlow, Inter, sans-serif",
		fontHeading: "Rajdhani, Barlow, sans-serif",
		cardRadius: "0.55rem",
	},
	"sand-indigo": {
		id: "sand-indigo",
		name: "Sand Indigo",
		description: "Warm neutral surfaces with indigo trust cues for refined retail.",
		primary: "#4338ca",
		primaryDark: "#3730a3",
		accent: "#ea580c",
		light: mode({ background: "#fffbeb", surface: "#fffdf7", text: "#292524", muted: "#78716c", border: "#eee4c9", glassBackground: "rgba(255, 253, 247, 0.8)", glassBorder: "rgba(67, 56, 202, 0.16)", glassShadow: "0 8px 32px rgba(67, 56, 202, 0.1)", scrollbarTrack: "rgba(67, 56, 202, 0.1)", scrollbarThumb: "rgba(79, 70, 229, 0.7)", scrollbarThumbHover: "rgba(55, 48, 163, 0.95)" }),
		dark: mode({ background: "#17151d", surface: "#282330", text: "#f5f3ff", muted: "#b3acbd", border: "#463d55", glassBackground: "rgba(21, 18, 27, 0.72)", glassBorder: "rgba(199, 210, 254, 0.16)", glassShadow: "0 8px 32px rgba(0, 0, 0, 0.46)", scrollbarTrack: "rgba(23, 21, 29, 0.9)", scrollbarThumb: "rgba(129, 140, 248, 0.75)", scrollbarThumbHover: "rgba(165, 180, 252, 0.95)" }),
		fontBody: "Merriweather Sans, Inter, sans-serif",
		fontHeading: "Nunito Sans, Merriweather Sans, sans-serif",
		cardRadius: "1.15rem",
	},
	"steel-gold": {
		id: "steel-gold",
		name: "Steel Gold",
		description: "A polished neutral and gold system for high-end devices.",
		primary: "#475569",
		primaryDark: "#334155",
		accent: "#ca8a04",
		light: mode({ background: "#f8fafc", surface: "#ffffff", text: "#1e293b", muted: "#64748b", border: "#dbe2ea", glassBackground: "rgba(255, 255, 255, 0.76)", glassBorder: "rgba(71, 85, 105, 0.18)", glassShadow: "0 8px 32px rgba(51, 65, 85, 0.13)", scrollbarTrack: "rgba(71, 85, 105, 0.11)", scrollbarThumb: "rgba(100, 116, 139, 0.72)", scrollbarThumbHover: "rgba(71, 85, 105, 0.95)" }),
		dark: mode({ background: "#11161d", surface: "#202a36", text: "#f1f5f9", muted: "#a6b3c2", border: "#3b4858", glassBackground: "rgba(13, 18, 24, 0.72)", glassBorder: "rgba(203, 213, 225, 0.16)", glassShadow: "0 8px 32px rgba(0, 0, 0, 0.48)", scrollbarTrack: "rgba(17, 22, 29, 0.9)", scrollbarThumb: "rgba(148, 163, 184, 0.75)", scrollbarThumbHover: "rgba(203, 213, 225, 0.95)" }),
		fontBody: "Work Sans, Inter, sans-serif",
		fontHeading: "Raleway, Work Sans, sans-serif",
		cardRadius: "0.9rem",
	},
} satisfies Record<string, ThemePreset>

export type ThemePresetId = keyof typeof THEME_PRESETS

export const DEFAULT_THEME_PRESET: ThemePresetId = "nova-blue-orange"

const hexToRgb = (hex: string) => {
	const value = hex.replace("#", "")
	const normalized = value.length === 3 ? value.split("").map((part) => `${part}${part}`).join("") : value
	const number = Number.parseInt(normalized, 16)
	return `${(number >> 16) & 255} ${(number >> 8) & 255} ${number & 255}`
}

export const getThemePreset = (id: string | undefined): ThemePreset =>
	THEME_PRESETS[id as ThemePresetId] ?? THEME_PRESETS[DEFAULT_THEME_PRESET]

/** CSS variables are emitted once on <html>; CSS switches light/dark values. */
export const themeToCssVariables = (theme: ThemePreset): Record<`--${string}`, string> => ({
	"--color-primary": hexToRgb(theme.primary),
	"--color-primary-dark": hexToRgb(theme.primaryDark),
	"--color-accent": hexToRgb(theme.accent),
	"--color-bg-light": hexToRgb(theme.light.background),
	"--color-surface-light": hexToRgb(theme.light.surface),
	"--color-text-light": hexToRgb(theme.light.text),
	"--color-muted-light": hexToRgb(theme.light.muted),
	"--color-border-light": hexToRgb(theme.light.border),
	"--color-bg-dark": hexToRgb(theme.dark.background),
	"--color-surface-dark": hexToRgb(theme.dark.surface),
	"--color-text-dark": hexToRgb(theme.dark.text),
	"--color-muted-dark": hexToRgb(theme.dark.muted),
	"--color-border-dark": hexToRgb(theme.dark.border),
	"--theme-glass-bg-light": theme.light.glassBackground,
	"--theme-glass-border-light": theme.light.glassBorder,
	"--theme-glass-shadow-light": theme.light.glassShadow,
	"--theme-scrollbar-track-light": theme.light.scrollbarTrack,
	"--theme-scrollbar-thumb-light": theme.light.scrollbarThumb,
	"--theme-scrollbar-thumb-hover-light": theme.light.scrollbarThumbHover,
	"--theme-glass-bg-dark": theme.dark.glassBackground,
	"--theme-glass-border-dark": theme.dark.glassBorder,
	"--theme-glass-shadow-dark": theme.dark.glassShadow,
	"--theme-scrollbar-track-dark": theme.dark.scrollbarTrack,
	"--theme-scrollbar-thumb-dark": theme.dark.scrollbarThumb,
	"--theme-scrollbar-thumb-hover-dark": theme.dark.scrollbarThumbHover,
	"--font-body": theme.fontBody,
	"--font-heading": theme.fontHeading,
	"--radius-card": theme.cardRadius,
})
