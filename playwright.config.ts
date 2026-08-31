import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
	testDir: "./tests/e2e",
	testMatch: "**/*.spec.ts",
	timeout: 60000,
	use: {
		baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:3000",
		trace: "retain-on-failure",
		headless: true,
	},
	webServer: {
		command: "npm run dev",
		url: "http://127.0.0.1:3000",
		reuseExistingServer: true,
		timeout: 120000,
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	reporter: [["list"], ["html", { open: "never" }]],
})
