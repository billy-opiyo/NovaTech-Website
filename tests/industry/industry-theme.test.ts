import { test } from "node:test"
import assert from "node:assert/strict"
import { THEME_PRESETS, themeToCssVariables } from "../../frontend/src/config/theme-presets"
import { themeOverridesFromIndustry } from "../../frontend/src/lib/industry-theme"

test("an electronics industry theme without dark colors keeps the original navy palette", () => {
	const overrides = themeOverridesFromIndustry({
		colors: { primary: "#0070f3", primaryDark: "#005bb5", accent: "#f97316", background: "#dbe6f4", surface: "#eaf1f8", text: "#102858" },
		typography: { body: "Inter", heading: "Inter" },
	})
	const defaultDark = THEME_PRESETS["nova-blue-orange"].dark
	assert.equal(overrides?.colors.dark?.background, defaultDark.background)
	assert.equal(overrides?.colors.dark?.surface, defaultDark.surface)
	assert.equal(overrides?.colors.dark?.text, defaultDark.text)
	assert.equal(overrides?.colors.dark?.muted, defaultDark.muted)
	assert.equal(overrides?.colors.dark?.border, defaultDark.border)
	const css = themeToCssVariables(THEME_PRESETS["nova-blue-orange"], overrides)
	assert.equal(css["--color-bg-dark"], "15 23 42")
	assert.equal(css["--color-surface-dark"], "30 41 59")
	assert.equal(css["--color-text-dark"], "226 232 240")
})

test("industry-specific dark palettes still override the navy defaults", () => {
	const overrides = themeOverridesFromIndustry({
		colors: { darkBackground: "#211916", darkSurface: "#30231e", darkText: "#fff4e6", darkMuted: "#d7c0aa", darkBorder: "#59443a" },
		typography: {},
	})
	assert.deepEqual(overrides?.colors.dark, {
		background: "#211916",
		surface: "#30231e",
		text: "#fff4e6",
		muted: "#d7c0aa",
		border: "#59443a",
	})
})
