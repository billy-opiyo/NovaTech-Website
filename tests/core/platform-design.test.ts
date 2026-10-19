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

test("platform splash supports glass, solid color, and legacy image modes safely", () => {
	assert.equal(platformSiteSettingsPatchSchema.safeParse({ splash: { enabled: true, backgroundMode: "glass", backgroundColor: "#071a2c", glassOpacity: 88, images: { darkDesktop: "/legacy.png" } } }).success, true)
	assert.equal(platformSiteSettingsPatchSchema.safeParse({ splash: { backgroundMode: "color", centerContentOnColor: true } }).success, true)
	assert.equal(platformSiteSettingsPatchSchema.safeParse({ splash: { centerContentOnColor: "yes" } }).success, false)
	assert.equal(platformSiteSettingsPatchSchema.safeParse({ splash: { enabled: "yes" } }).success, false)
	assert.equal(platformSiteSettingsPatchSchema.safeParse({ splash: { backgroundMode: "gradient" } }).success, false)
	assert.equal(platformSiteSettingsPatchSchema.safeParse({ splash: { backgroundColor: "navy" } }).success, false)
	assert.equal(platformSiteSettingsPatchSchema.safeParse({ splash: { glassOpacity: 120 } }).success, false)
	const splash = readFileSync("frontend/src/components/layout/SplashScreen.tsx", "utf8")
	const styles = readFileSync("frontend/src/app/globals.css", "utf8")
	const platformNavigation = readFileSync("frontend/src/app/platform/PlatformNavigation.tsx", "utf8")
	assert.match(splash, /backgroundMode === "images"/)
	assert.match(splash, /if \(!useBackgroundImages\) return/)
	assert.match(splash, /splash-screen--solid/)
	assert.match(splash, /splash-screen--glass/)
	assert.match(splash, /backgroundMode === "glass"/)
	assert.match(styles, /\.splash-screen--centered-content > \.splash-content[\s\S]*?justify-content: center/)
	assert.match(platformNavigation, /href="\/?\?platformHome=1"/)
	assert.match(platformNavigation, /Platform home/)
	assert.match(splash, /splashSettings\?\.enabled \?\? clientConfig\.features\.showSplashScreen/)
	const settings = readFileSync("frontend/src/lib/platform-site-settings.ts", "utf8")
	assert.match(settings, /enabled: true/)
	assert.doesNotMatch(settings.slice(settings.indexOf("\t\tsplash: {"), settings.indexOf("\t\thero: {")), /backgroundColor:|glassOpacity:/)
	assert.match(styles, /\.splash-screen\.splash-screen--solid[\s\S]*?background-image: none/)
	assert.match(splash, /splash-screen--centered-content/)
	assert.match(settings, /centerContentOnColor: true/)
	assert.match(settings, /\.\.\.base\.splash,[\s\S]*?\.\.\.patch\.splash/)
	assert.match(styles, /\.splash-screen\.splash-screen--glass[\s\S]*?background-color: rgb\(var\(--color-theme-bg\)\)/)
	const glassSurface = styles.slice(styles.indexOf(".splash-screen--glass::before"), styles.indexOf(".splash-screen--solid .splash-welcome"))
	for (const token of ["var(--glass-bg)", "var(--glass-border)", "var(--glass-shadow)", "var(--glass-blur"]) assert.ok(glassSurface.includes(token), `splash glass surface uses ${token}`)
	assert.match(styles, /\.dark \.splash-screen--glass::before[\s\S]*?rgb\(var\(--color-theme-surface\) \/ 0\.78\)/)
})

test("platform homepage hero uses editable, non-empty multi-industry copy and ignores legacy artwork", () => {
	const hero = readFileSync("frontend/src/components/home/PlatformHero.tsx", "utf8")
	const settings = readFileSync("frontend/src/lib/platform-site-settings.ts", "utf8")
	assert.match(settings, /title: "Nurava HubStores is the technology platform"/)
	assert.match(settings, /highlight: "connecting you with trusted stores"/)
	assert.match(settings, /const hero = \{/)
	assert.match(settings, /title: nonBlank\(patch\.hero\?\.title/)
	assert.match(settings, /description: nonBlank\(patch\.hero\?\.description/)
	assert.match(settings, /delete safePatch\.hero/)
	assert.match(settings, /value\.replaceAll\("Nurava Tech", "Nurava HubStores"\)/)
	assert.doesNotMatch(settings.slice(settings.indexOf("\tconst hero = {"), settings.indexOf("\tconst contact =")), /images/)
	assert.match(hero, /platformSettings\?\.hero/)
	assert.match(hero, /<TrustStrip \/>/)
	assert.doesNotMatch(hero, /TrustStrip isLight=/)
	assert.doesNotMatch(hero, /<picture|<source|HeroArtwork|heroImages|Nurava%20Tech%20hero/)
	assert.equal(platformSiteSettingsPatchSchema.safeParse({ hero: { images: { darkDesktop: "/legacy.png" } } }).success, true)
})
