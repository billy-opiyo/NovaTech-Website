import { expect, test } from "@playwright/test"
import { pathToFileURL } from "node:url"
import path from "node:path"

const offlinePage = pathToFileURL(path.resolve(process.cwd(), "capacitor-shell/offline.html")).href

test("bundled Android offline page applies only valid saved theme colors", async ({ page }) => {
	const validPalette = new URLSearchParams({
		background: "#f8fafc",
		surface: "#e2e8f0",
		text: "#0f172a",
		muted: "#475569",
		primary: "#0ea5e9",
		lightIcons: "true",
	})
	await page.goto(`${offlinePage}?${validPalette.toString()}`)

	const appliedPalette = await page.evaluate(() => ({
		background: getComputedStyle(document.documentElement).getPropertyValue("--offline-bg").trim(),
		surface: getComputedStyle(document.documentElement).getPropertyValue("--offline-surface").trim(),
		text: getComputedStyle(document.documentElement).getPropertyValue("--offline-text").trim(),
		muted: getComputedStyle(document.documentElement).getPropertyValue("--offline-muted").trim(),
		primary: getComputedStyle(document.documentElement).getPropertyValue("--offline-primary").trim(),
		colorScheme: getComputedStyle(document.documentElement).colorScheme,
	}))
	expect(appliedPalette).toEqual({
		background: "#f8fafc",
		surface: "#e2e8f0",
		text: "#0f172a",
		muted: "#475569",
		primary: "#0ea5e9",
		colorScheme: "light",
	})

	await page.goto(`${offlinePage}?background=red&primary=%23fff`)
	const fallbackPalette = await page.evaluate(() => ({
		background: getComputedStyle(document.documentElement).getPropertyValue("--offline-bg").trim(),
		primary: getComputedStyle(document.documentElement).getPropertyValue("--offline-primary").trim(),
	}))
	expect(fallbackPalette).toEqual({ background: "#0b1220", primary: "#f97316" })
})
