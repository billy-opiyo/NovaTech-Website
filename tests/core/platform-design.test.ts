import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { platformSiteSettingsPatchSchema } from "../../backend/validators/platformSiteSettingsValidator"
import { THEME_PRESETS, themeToCssVariables } from "../../frontend/src/config/theme-presets"

test("platform design defaults retain the existing primary theme variables", () => {
	const defaults = themeToCssVariables(THEME_PRESETS["nova-blue-orange"])
	assert.equal(defaults["--color-primary"], "0 112 243")
	assert.equal(defaults["--color-bg-dark"], "15 23 42")
	assert.equal(defaults["--font-body"], THEME_PRESETS["nova-blue-orange"].fontBody)
	assert.equal(defaults["--radius-card"], THEME_PRESETS["nova-blue-orange"].cardRadius)
	assert.equal(defaults["--glass-blur"], "12px")
})

test("platform design overrides apply both-mode colors, typography, and glass controls", () => {
	const variables = themeToCssVariables(THEME_PRESETS["nova-blue-orange"], {
		colors: { primary: "#123456", light: { background: "#abcdef" }, dark: { text: "#fedcba" } },
		typography: { bodyFont: "georgia", headingFont: "verdana" },
		glass: { blurPx: 18, cardRadiusPx: 10, lightOpacity: 40, darkBorderOpacity: 20, shadow: "soft" },
	})
	assert.equal(variables["--color-primary"], "18 52 86")
	assert.equal(variables["--color-bg-light"], "171 205 239")
	assert.equal(variables["--color-text-dark"], "254 220 186")
	assert.equal(variables["--font-body"], "Georgia, 'Times New Roman', serif")
	assert.equal(variables["--font-heading"], "Verdana, Geneva, sans-serif")
	assert.equal(variables["--glass-blur"], "18px")
	assert.equal(variables["--radius-card"], "10px")
	assert.equal(variables["--theme-glass-bg-light"], "rgba(234, 241, 248, 0.4)")
	assert.equal(variables["--theme-glass-border-dark"], "rgba(18, 52, 86, 0.2)")
})

test("platform design settings reject unsafe color, font, and glass values", () => {
	assert.equal(platformSiteSettingsPatchSchema.safeParse({ design: { colors: { primary: "red" } } }).success, false)
	assert.equal(platformSiteSettingsPatchSchema.safeParse({ design: { typography: { bodyFont: "https://example.com/font.css" } } }).success, false)
	assert.equal(platformSiteSettingsPatchSchema.safeParse({ design: { glass: { blurPx: 100 } } }).success, false)
	assert.equal(platformSiteSettingsPatchSchema.safeParse({ design: { colors: { primary: "#123456" }, glass: { blurPx: 24 } } }).success, true)
})

test("platform homepage hero stays on original artwork and ignores legacy design overrides", () => {
	const hero = readFileSync("frontend/src/components/home/PlatformHero.tsx", "utf8")
	const defaults = readFileSync("frontend/src/lib/platform-site-settings.ts", "utf8")
	const settingsMerge = defaults.slice(defaults.indexOf("export function mergePlatformSiteSettings"))
	assert.match(hero, /Nurava%20Tech%20hero%20desktop-image-ui\.png/)
	assert.match(hero, /Nurava%20Tech%20hero%20mobile-image-ui\.png/)
	assert.doesNotMatch(hero, /platformSettings|settings\?\.hero|heroSettings/)
	assert.match(settingsMerge, /delete safePatch\.hero/)
})
