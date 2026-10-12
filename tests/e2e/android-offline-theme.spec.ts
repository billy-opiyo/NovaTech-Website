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
		glassBackground: "rgba(4, 15, 28, 0.72)",
		lightIcons: "true",
	})
	await page.goto(`${offlinePage}?${validPalette.toString()}`)

	const appliedPalette = await page.evaluate(() => ({
		background: getComputedStyle(document.documentElement).getPropertyValue("--offline-bg").trim(),
		surface: getComputedStyle(document.documentElement).getPropertyValue("--offline-surface").trim(),
		text: getComputedStyle(document.documentElement).getPropertyValue("--offline-text").trim(),
		muted: getComputedStyle(document.documentElement).getPropertyValue("--offline-muted").trim(),
		primary: getComputedStyle(document.documentElement).getPropertyValue("--offline-primary").trim(),
		glassBackground: getComputedStyle(document.documentElement).getPropertyValue("--offline-glass-bg").trim(),
		colorScheme: getComputedStyle(document.documentElement).colorScheme,
	}))
	expect(appliedPalette).toEqual({
		background: "#f8fafc",
		surface: "#e2e8f0",
		text: "#0f172a",
		muted: "#475569",
		primary: "#0ea5e9",
		glassBackground: "rgba(4, 15, 28, 0.72)",
		colorScheme: "light",
	})
	const dialogStyles = await page.locator(".dialog").evaluate((element) => {
		const styles = getComputedStyle(element)
		return { borderWidth: styles.borderTopWidth, background: styles.backgroundImage }
	})
	const iconStyles = await page.locator(".icon").evaluate((element) => {
		const styles = getComputedStyle(element)
		return { borderWidth: styles.borderTopWidth, background: styles.backgroundColor }
	})
	expect(dialogStyles.borderWidth).toBe("0px")
	expect(dialogStyles.background).toContain("linear-gradient")
	expect(iconStyles.borderWidth).toBe("0px")
	expect(iconStyles.background).not.toBe("rgba(0, 0, 0, 0)")

	await page.goto(`${offlinePage}?background=red&primary=%23fff`)
	const fallbackPalette = await page.evaluate(() => ({
		background: getComputedStyle(document.documentElement).getPropertyValue("--offline-bg").trim(),
		primary: getComputedStyle(document.documentElement).getPropertyValue("--offline-primary").trim(),
	}))
	expect(fallbackPalette).toEqual({ background: "#0b1220", primary: "#f97316" })
})

test("bundled Android offline page retries and returns to the requested page when it is reachable", async ({ page }) => {
	const targetUrl = "http://127.0.0.1:3000/__offline_recovery_test"
	let targetRequests = 0
	await page.route(targetUrl, async (route) => {
		targetRequests += 1
		if (targetRequests === 1) {
			await route.abort("failed")
			return
		}
		await route.fulfill({
			status: 200,
			contentType: "text/html",
			body: "<!doctype html><title>Recovered</title><h1>Connection restored</h1>",
		})
	})

	await page.goto(`${offlinePage}?url=${encodeURIComponent(targetUrl)}`)
	await expect(page.getByRole("heading", { name: "Connection restored" })).toBeVisible({ timeout: 10000 })
	expect(targetRequests).toBeGreaterThanOrEqual(3)
})
