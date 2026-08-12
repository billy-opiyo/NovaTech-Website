import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
	testDir: "./tests/e2e",
	testMatch: "**/*.spec.ts",
	use: {
		baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:3000",
		trace: "retain-on-failure",
		headless: true,
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	reporter: [["list"], ["html", { open: "never" }]],
})
