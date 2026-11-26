import type { PlatformThemeOverrides } from "@/config/theme-presets"

type CustomColors = NonNullable<PlatformThemeOverrides["colors"]>

const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)))
const rgb = (hex: string) => {
	const value = hex.replace("#", "")
	return [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16))
}
const hex = (channels: number[]) => `#${channels.map((channel) => clamp(channel).toString(16).padStart(2, "0")).join("")}`
const mix = (first: string, second: string, weight: number) => hex(rgb(first).map((channel, index) => channel * (1 - weight) + rgb(second)[index] * weight))
const luminance = (color: string) => rgb(color).map((channel) => channel / 255).map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
const contrast = (first: string, second: string) => {
	const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a)
	return (lighter + 0.05) / (darker + 0.05)
}
const readableText = (background: string) => contrast(background, "#ffffff") >= contrast(background, "#111827") ? "#ffffff" : "#111827"
const readableMutedText = (background: string) => {
	const text = readableText(background)
	let result = text
	for (let step = 1; step <= 16; step += 1) {
		const candidate = mix(text, background, step / 32)
		if (contrast(candidate, background) < 4.5) break
		result = candidate
	}
	return result
}

function accessibleActionColor(color: string) {
	let result = color
	for (let step = 0; step < 16 && contrast(result, "#ffffff") < 4.5; step += 1) result = mix(result, "#111827", 0.12)
	return result
}

/** Builds a coherent light/dark palette and darkens action colors to keep white button text readable. */
export function createAccessibleCustomColors(primary: string, accent: string): CustomColors {
	const primaryAction = accessibleActionColor(primary)
	const accentAction = accessibleActionColor(accent)
	const lightBackground = mix("#ffffff", primary, 0.045)
	const lightSurface = mix("#ffffff", primary, 0.015)
	const darkBackground = mix("#101318", primary, 0.13)
	const darkSurface = mix("#202630", primary, 0.18)
	return {
		primary: primaryAction,
		primaryDark: mix(primaryAction, "#000000", 0.18),
		accent: accentAction,
		light: {
			background: lightBackground,
			surface: lightSurface,
			text: readableText(lightSurface),
			muted: readableMutedText(lightSurface),
			border: mix(lightSurface, primaryAction, 0.2),
		},
		dark: {
			background: darkBackground,
			surface: darkSurface,
			text: readableText(darkSurface),
			muted: readableMutedText(darkSurface),
			border: mix(darkSurface, primary, 0.36),
		},
	}
}

