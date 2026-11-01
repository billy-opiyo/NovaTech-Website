/**
 * Developer-managed visual presets.
 *
 * Keep these presets free of client data. Client-specific branding belongs in
 * client.config.ts, while this file contains reusable multi-industry storefront UI
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
	primaryLight?: string
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

type ThemePaletteSpec = {
	id: string
	name: string
	description: string
	primary: string
	primaryDark: string
	accent: string
	tone: "cool" | "warm" | "sage" | "rose" | "sand"
	fontBody: string
	fontHeading: string
	cardRadius: string
}

const additionalPaletteTones = {
	cool: {
		light: { background: "#f4f7fb", surface: "#ffffff", text: "#172033", muted: "#64748b", border: "#d9e2ef" },
		dark: { background: "#0b1220", surface: "#151f31", text: "#e8eef8", muted: "#a6b2c5", border: "#2b374b" },
	},
	warm: {
		light: { background: "#faf7f2", surface: "#fffdf9", text: "#29231e", muted: "#756c63", border: "#e8dfd4" },
		dark: { background: "#1c1917", surface: "#292521", text: "#f5efe7", muted: "#b5a89a", border: "#403a33" },
	},
	sage: {
		light: { background: "#f3f8f4", surface: "#ffffff", text: "#1e3025", muted: "#65766b", border: "#dce8dd" },
		dark: { background: "#101b15", surface: "#1b2a20", text: "#e8f5eb", muted: "#a5b8a9", border: "#334a39" },
	},
	rose: {
		light: { background: "#fff6f8", surface: "#ffffff", text: "#3d2630", muted: "#876c78", border: "#f0dce4" },
		dark: { background: "#21141b", surface: "#32202a", text: "#faeaf1", muted: "#c5a6b4", border: "#513646" },
	},
	sand: {
		light: { background: "#faf8f1", surface: "#fffefa", text: "#302d24", muted: "#797461", border: "#e9e3d0" },
		dark: { background: "#1d1b15", surface: "#2b291f", text: "#f6f2e4", muted: "#bcb69c", border: "#454235" },
	},
} as const

const hexRgb = (hex: string) => {
	const value = Number.parseInt(hex.slice(1), 16)
	return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`
}

const createAdditionalThemePreset = (spec: ThemePaletteSpec): ThemePreset => {
	const tone = additionalPaletteTones[spec.tone]
	const colors = (scheme: "light" | "dark"): ThemeModeColors => {
		const base = tone[scheme]
		const opacity = scheme === "light" ? 0.12 : 0.2
		return mode({
			...base,
			glassBackground: scheme === "light" ? "rgba(255, 255, 255, 0.76)" : "rgba(5, 10, 18, 0.72)",
			glassBorder: `rgba(${hexRgb(spec.primary)}, ${opacity})`,
			glassShadow: scheme === "light" ? "0 8px 30px rgba(15, 23, 42, 0.12)" : "0 10px 34px rgba(0, 0, 0, 0.4)",
			scrollbarTrack: `rgba(${hexRgb(spec.primary)}, ${scheme === "light" ? 0.1 : 0.2})`,
			scrollbarThumb: `rgba(${hexRgb(spec.primary)}, 0.7)`,
			scrollbarThumbHover: `rgba(${hexRgb(spec.primaryDark)}, 0.92)`,
		})
	}
	return {
		...spec,
		light: colors("light"),
		dark: colors("dark"),
	}
}

// Five additional options for each of the four seeded industries. They remain
// universal presets so any merchant can select any palette for their store.
const ADDITIONAL_THEME_PRESETS = {
	"arctic-cobalt": createAdditionalThemePreset({ id: "arctic-cobalt", name: "Arctic Cobalt", description: "Crisp cobalt and cyan for electronics and modern tech stores.", primary: "#1d4ed8", primaryDark: "#1e40af", accent: "#0891b2", tone: "cool", fontBody: "Inter, ui-sans-serif, sans-serif", fontHeading: "Space Grotesk, Inter, sans-serif", cardRadius: "0.8rem" }),
	"silicon-graphite": createAdditionalThemePreset({ id: "silicon-graphite", name: "Silicon Graphite", description: "Quiet graphite surfaces with a bright blue signal accent.", primary: "#475569", primaryDark: "#334155", accent: "#0284c7", tone: "cool", fontBody: "Roboto, Inter, sans-serif", fontHeading: "Roboto, Inter, sans-serif", cardRadius: "0.65rem" }),
	"circuit-emerald": createAdditionalThemePreset({ id: "circuit-emerald", name: "Circuit Emerald", description: "Confident emerald with amber details for trusted technology retail.", primary: "#047857", primaryDark: "#065f46", accent: "#d97706", tone: "sage", fontBody: "DM Sans, Inter, sans-serif", fontHeading: "Manrope, DM Sans, sans-serif", cardRadius: "0.9rem" }),
	"gamer-ember": createAdditionalThemePreset({ id: "gamer-ember", name: "Gamer Ember", description: "Performance red and ember orange with compact squared cards.", primary: "#b91c1c", primaryDark: "#991b1b", accent: "#ea580c", tone: "cool", fontBody: "Barlow, Inter, sans-serif", fontHeading: "Rajdhani, Barlow, sans-serif", cardRadius: "0.5rem" }),
	"studio-violet": createAdditionalThemePreset({ id: "studio-violet", name: "Studio Violet", description: "Creative violet paired with clear cyan accents for digital gear.", primary: "#6d28d9", primaryDark: "#5b21b6", accent: "#0891b2", tone: "cool", fontBody: "Inter, ui-sans-serif, sans-serif", fontHeading: "Sora, Inter, sans-serif", cardRadius: "1.1rem" }),
	"oak-and-clay": createAdditionalThemePreset({ id: "oak-and-clay", name: "Oak & Clay", description: "Natural oak neutrals and clay accents for furniture and home goods.", primary: "#9a3412", primaryDark: "#7c2d12", accent: "#4d7c0f", tone: "warm", fontBody: "Lato, Inter, sans-serif", fontHeading: "Merriweather Sans, Lato, sans-serif", cardRadius: "0.85rem" }),
	"linen-sage": createAdditionalThemePreset({ id: "linen-sage", name: "Linen Sage", description: "Soft linen backgrounds with a calm, botanical green.", primary: "#4d7c0f", primaryDark: "#3f6212", accent: "#a16207", tone: "sage", fontBody: "Source Sans 3, Inter, sans-serif", fontHeading: "Plus Jakarta Sans, Source Sans 3, sans-serif", cardRadius: "1.2rem" }),
	"walnut-brass": createAdditionalThemePreset({ id: "walnut-brass", name: "Walnut Brass", description: "Deep walnut, antique brass, and editorial serif headings.", primary: "#854d0e", primaryDark: "#713f12", accent: "#0f766e", tone: "warm", fontBody: "Merriweather Sans, Inter, sans-serif", fontHeading: "Georgia, 'Times New Roman', serif", cardRadius: "0.7rem" }),
	"coastal-home": createAdditionalThemePreset({ id: "coastal-home", name: "Coastal Home", description: "Sea-glass blue and warm terracotta for relaxed living spaces.", primary: "#0369a1", primaryDark: "#075985", accent: "#c2410c", tone: "cool", fontBody: "Nunito Sans, Inter, sans-serif", fontHeading: "Nunito Sans, Inter, sans-serif", cardRadius: "1.25rem" }),
	"terracotta-living": createAdditionalThemePreset({ id: "terracotta-living", name: "Terracotta Living", description: "Sunbaked terracotta and deep teal over warm, natural surfaces.", primary: "#c2410c", primaryDark: "#9a3412", accent: "#0f766e", tone: "sand", fontBody: "DM Sans, Inter, sans-serif", fontHeading: "Outfit, DM Sans, sans-serif", cardRadius: "1rem" }),
	"berry-cream": createAdditionalThemePreset({ id: "berry-cream", name: "Berry Cream", description: "Berry pink and soft violet for cakes, gifts, and celebrations.", primary: "#be185d", primaryDark: "#9d174d", accent: "#7c3aed", tone: "rose", fontBody: "Nunito Sans, Inter, sans-serif", fontHeading: "Playfair Display, Georgia, serif", cardRadius: "1.35rem" }),
	"cocoa-mint": createAdditionalThemePreset({ id: "cocoa-mint", name: "Cocoa & Mint", description: "Rich cocoa brown balanced with a fresh mint green accent.", primary: "#7c2d12", primaryDark: "#64230e", accent: "#047857", tone: "warm", fontBody: "Lato, Inter, sans-serif", fontHeading: "Lora, Georgia, serif", cardRadius: "1rem" }),
	"patisserie-lilac": createAdditionalThemePreset({ id: "patisserie-lilac", name: "Patisserie Lilac", description: "Elegant lilac and rose for boutique bakeries and patisseries.", primary: "#7e22ce", primaryDark: "#6b21a8", accent: "#db2777", tone: "rose", fontBody: "DM Sans, Inter, sans-serif", fontHeading: "Cormorant Garamond, Georgia, serif", cardRadius: "1.4rem" }),
	"citrus-bakery": createAdditionalThemePreset({ id: "citrus-bakery", name: "Citrus Bakery", description: "Zesty orange and garden green with bright bakery-counter warmth.", primary: "#c2410c", primaryDark: "#9a3412", accent: "#15803d", tone: "sand", fontBody: "Nunito Sans, Inter, sans-serif", fontHeading: "Baloo 2, Nunito Sans, sans-serif", cardRadius: "1.1rem" }),
	"rosewater": createAdditionalThemePreset({ id: "rosewater", name: "Rosewater", description: "Polished rose and apricot for refined celebration brands.", primary: "#9d174d", primaryDark: "#831843", accent: "#ea580c", tone: "rose", fontBody: "Inter, ui-sans-serif, sans-serif", fontHeading: "DM Serif Display, Georgia, serif", cardRadius: "1.2rem" }),
	"atelier-noir": createAdditionalThemePreset({ id: "atelier-noir", name: "Atelier Noir", description: "Tailored charcoal and muted bronze for premium boutiques.", primary: "#374151", primaryDark: "#1f2937", accent: "#a16207", tone: "warm", fontBody: "Work Sans, Inter, sans-serif", fontHeading: "Cormorant Garamond, Georgia, serif", cardRadius: "0.55rem" }),
	"runway-wine": createAdditionalThemePreset({ id: "runway-wine", name: "Runway Wine", description: "Editorial wine red with a soft violet highlight.", primary: "#881337", primaryDark: "#701a35", accent: "#7e22ce", tone: "rose", fontBody: "Manrope, Inter, sans-serif", fontHeading: "Playfair Display, Georgia, serif", cardRadius: "0.75rem" }),
	"denim-ivory": createAdditionalThemePreset({ id: "denim-ivory", name: "Denim & Ivory", description: "Everyday denim blue with energetic orange details.", primary: "#1d4ed8", primaryDark: "#1e40af", accent: "#ea580c", tone: "sand", fontBody: "Lato, Inter, sans-serif", fontHeading: "Montserrat, Lato, sans-serif", cardRadius: "0.8rem" }),
	"market-olive": createAdditionalThemePreset({ id: "market-olive", name: "Market Olive", description: "Earthy olive and harvest amber for curated local collections.", primary: "#3f6212", primaryDark: "#365314", accent: "#b45309", tone: "sage", fontBody: "Source Sans 3, Inter, sans-serif", fontHeading: "Merriweather, Georgia, serif", cardRadius: "0.9rem" }),
	"monsoon-teal": createAdditionalThemePreset({ id: "monsoon-teal", name: "Monsoon Teal", description: "Deep monsoon teal and berry accents for expressive fashion stores.", primary: "#0f766e", primaryDark: "#115e59", accent: "#be123c", tone: "cool", fontBody: "DM Sans, Inter, sans-serif", fontHeading: "Outfit, DM Sans, sans-serif", cardRadius: "1rem" }),
} satisfies Record<string, ThemePreset>

export const THEME_PRESETS = {
	"nova-blue-orange": {
		id: "nova-blue-orange",
		name: "Nova Blue & Orange",
		description: "Trustworthy blue with a high-energy deals accent.",
		primary: "#0070f3",
		primaryDark: "#005bb5",
		accent: "#f97316",
		light: mode({ background: "#dbe6f4", surface: "#eaf1f8", text: "#102858", muted: "#536b8f", border: "#c1d1e6", glassBackground: "rgba(239, 245, 252, 0.64)", glassBorder: "rgba(255, 255, 255, 0.72)", glassShadow: "0 8px 32px rgba(42, 74, 121, 0.15)", scrollbarTrack: "rgba(126, 155, 196, 0.2)", scrollbarThumb: "rgba(27, 65, 126, 0.62)", scrollbarThumbHover: "rgba(16, 50, 106, 0.8)" }),
		dark: mode({ background: "#0f172a", surface: "#1e293b", text: "#e2e8f0", muted: "#94a3b8", border: "#334155", glassBackground: "rgba(0, 0, 0, 0.3)", glassBorder: "rgba(255, 255, 255, 0.1)", glassShadow: "0 8px 32px rgba(0, 0, 0, 0.4)", scrollbarTrack: "rgba(15, 23, 42, 0.8)", scrollbarThumb: "rgba(59, 130, 246, 0.75)", scrollbarThumbHover: "rgba(96, 165, 250, 0.95)" }),
		fontBody: "Inter, ui-sans-serif, system-ui, sans-serif",
		fontHeading: "Inter, ui-sans-serif, system-ui, sans-serif",
		cardRadius: "1rem",
	},
	"nova-orange-navy-blue": {
		id: "nova-orange-navy-blue",
		name: "Nova Orange & navy Blue",
		description: "Warm orange actions balanced by confident navy surfaces and text.",
		primary: "#c2410c",
		primaryLight: "#fb923c",
		primaryDark: "#9a3412",
		accent: "#f97316",
		light: mode({ background: "#eef3f9", surface: "#ffffff", text: "#10243b", muted: "#52677f", border: "#cbd7e5", glassBackground: "rgba(255, 255, 255, 0.76)", glassBorder: "rgba(23, 59, 99, 0.2)", glassShadow: "0 8px 32px rgba(12, 35, 61, 0.14)", scrollbarTrack: "rgba(23, 59, 99, 0.12)", scrollbarThumb: "rgba(194, 65, 12, 0.72)", scrollbarThumbHover: "rgba(154, 52, 18, 0.95)" }),
		dark: mode({ background: "#08182a", surface: "#10243b", text: "#edf4fc", muted: "#a9bbcf", border: "#29435f", glassBackground: "rgba(4, 15, 28, 0.72)", glassBorder: "rgba(249, 115, 22, 0.2)", glassShadow: "0 8px 32px rgba(0, 0, 0, 0.46)", scrollbarTrack: "rgba(8, 24, 42, 0.9)", scrollbarThumb: "rgba(249, 115, 22, 0.72)", scrollbarThumbHover: "rgba(251, 146, 60, 0.95)" }),
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
		description: "Confident violet and gold for a polished, premium storefront.",
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
		description: "Calm teal and coral for approachable everyday commerce.",
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
	...ADDITIONAL_THEME_PRESETS,
} satisfies Record<string, ThemePreset>

export type ThemePresetId = keyof typeof THEME_PRESETS

export const DEFAULT_THEME_PRESET: ThemePresetId = "nova-blue-orange"

const hexToRgb = (hex: string) => {
	const value = hex.replace("#", "")
	const normalized = value.length === 3 ? value.split("").map((part) => `${part}${part}`).join("") : value
	const number = Number.parseInt(normalized, 16)
	return `${(number >> 16) & 255} ${(number >> 8) & 255} ${number & 255}`
}

type ThemeColorMode = Partial<Record<"background" | "surface" | "text" | "muted" | "border", string>>
export type PlatformThemeOverrides = {
	colors?: { primary?: string; primaryLight?: string; primaryDark?: string; accent?: string; light?: ThemeColorMode; dark?: ThemeColorMode }
	typography?: { bodyFont?: string; headingFont?: string; fontSize?: "small" | "normal" | "large" | "extraLarge" }
	glass?: { blurPx?: number; cardRadiusPx?: number; lightOpacity?: number; darkOpacity?: number; lightBorderOpacity?: number; darkBorderOpacity?: number; shadow?: "none" | "soft" | "balanced" | "bold" }
}

const rgbaFromHex = (hex: string, percentage: number) => `rgba(${hexToRgb(hex).replaceAll(" ", ", ")}, ${Math.min(100, Math.max(0, percentage)) / 100})`
const fontStacks: Record<string, string> = {
	system: "ui-sans-serif, system-ui, sans-serif",
	inter: "Inter, ui-sans-serif, system-ui, sans-serif",
	georgia: "Georgia, 'Times New Roman', serif",
	trebuchet: "'Trebuchet MS', sans-serif",
	verdana: "Verdana, Geneva, sans-serif",
}
const fontSizeScales = { small: "90%", normal: "100%", large: "110%", extraLarge: "120%" } as const
const shadowStyles = {
	none: "none",
	soft: "0 4px 18px rgba(15, 23, 42, 0.10)",
	balanced: "0 8px 32px rgba(15, 23, 42, 0.18)",
	bold: "0 14px 44px rgba(15, 23, 42, 0.30)",
} as const

export const getThemePreset = (id: string | undefined): ThemePreset =>
	THEME_PRESETS[id as ThemePresetId] ?? THEME_PRESETS[DEFAULT_THEME_PRESET]

/** CSS variables are emitted once on <html>; CSS switches light/dark values. */
export const themeToCssVariables = (theme: ThemePreset, overrides?: PlatformThemeOverrides): Record<`--${string}`, string> => {
	const primary = overrides?.colors?.primary || theme.primary
	const primaryDark = overrides?.colors?.primaryDark || theme.primaryDark
	const accent = overrides?.colors?.accent || theme.accent
	const color = (mode: "light" | "dark", key: keyof ThemeColorMode) => overrides?.colors?.[mode]?.[key] || theme[mode][key]
	const glassBackground = (mode: "light" | "dark") => {
		const opacity = mode === "light" ? overrides?.glass?.lightOpacity : overrides?.glass?.darkOpacity
		return opacity === undefined ? theme[mode].glassBackground : rgbaFromHex(color(mode, "surface"), opacity)
	}
	const glassBorder = (mode: "light" | "dark") => {
		const opacity = mode === "light" ? overrides?.glass?.lightBorderOpacity : overrides?.glass?.darkBorderOpacity
		return opacity === undefined ? theme[mode].glassBorder : rgbaFromHex(primary, opacity)
	}
	const shadow = overrides?.glass?.shadow ? shadowStyles[overrides.glass.shadow] : null
	const scrollbarColors = (mode: "light" | "dark") => overrides?.colors?.primary
		? { track: rgbaFromHex(primary, mode === "light" ? 11 : 22), thumb: rgbaFromHex(primary, 75), hover: rgbaFromHex(primary, 95) }
		: { track: theme[mode].scrollbarTrack, thumb: theme[mode].scrollbarThumb, hover: theme[mode].scrollbarThumbHover }
	const lightScrollbar = scrollbarColors("light")
	const darkScrollbar = scrollbarColors("dark")
	return {
	"--color-primary": hexToRgb(primary),
	"--color-primary-light": overrides?.colors?.primaryLight || theme.primaryLight || primary,
	"--color-primary-dark": hexToRgb(primaryDark),
	"--color-accent": hexToRgb(accent),
	"--color-bg-light": hexToRgb(color("light", "background")),
	"--color-surface-light": hexToRgb(color("light", "surface")),
	"--color-text-light": hexToRgb(color("light", "text")),
	"--color-muted-light": hexToRgb(color("light", "muted")),
	"--color-border-light": hexToRgb(color("light", "border")),
	"--color-bg-dark": hexToRgb(color("dark", "background")),
	"--color-surface-dark": hexToRgb(color("dark", "surface")),
	"--color-text-dark": hexToRgb(color("dark", "text")),
	"--color-muted-dark": hexToRgb(color("dark", "muted")),
	"--color-border-dark": hexToRgb(color("dark", "border")),
	"--theme-glass-bg-light": glassBackground("light"),
	"--theme-glass-border-light": glassBorder("light"),
	"--theme-glass-shadow-light": shadow || theme.light.glassShadow,
	"--theme-scrollbar-track-light": lightScrollbar.track,
	"--theme-scrollbar-thumb-light": lightScrollbar.thumb,
	"--theme-scrollbar-thumb-hover-light": lightScrollbar.hover,
	"--theme-glass-bg-dark": glassBackground("dark"),
	"--theme-glass-border-dark": glassBorder("dark"),
	"--theme-glass-shadow-dark": shadow || theme.dark.glassShadow,
	"--theme-scrollbar-track-dark": darkScrollbar.track,
	"--theme-scrollbar-thumb-dark": darkScrollbar.thumb,
	"--theme-scrollbar-thumb-hover-dark": darkScrollbar.hover,
	"--font-body": fontStacks[overrides?.typography?.bodyFont || ""] || theme.fontBody,
	"--font-heading": fontStacks[overrides?.typography?.headingFont || ""] || theme.fontHeading,
	"--site-font-size": fontSizeScales[overrides?.typography?.fontSize || "normal"],
	"--radius-card": overrides?.glass?.cardRadiusPx === undefined ? theme.cardRadius : `${overrides.glass.cardRadiusPx}px`,
	"--glass-blur": overrides?.glass?.blurPx === undefined ? "12px" : `${overrides.glass.blurPx}px`,
}}
