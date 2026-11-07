import { getThemePreset, type PlatformThemeOverrides, type ThemePreset } from "../config/theme-presets"
import type { PlatformDesignSettings } from "./platform-site-settings"

export type StoreThemeSource = {
	ownerType: "MERCHANT" | "PLATFORM"
	themePreset: string
	platformTheme?: PlatformDesignSettings
	themeOverrides?: PlatformThemeOverrides
}

export function resolveStoreTheme(source: StoreThemeSource): { preset: ThemePreset; overrides?: PlatformThemeOverrides } {
	return {
		preset: getThemePreset(source.themePreset),
		overrides: source.ownerType === "PLATFORM" ? source.platformTheme : source.themeOverrides,
	}
}
