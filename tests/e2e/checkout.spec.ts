import { test, expect } from "@playwright/test"

test("catalog search and checkout form are browser-accessible", async ({ page }) => {
	const product = {
		id: "e2e-product-1",
		name: "iPhone 16 E2E Test",
		slug: "iphone-16-e2e-test",
		description: "Deterministic product fixture for browser smoke testing.",
		brand: "Apple",
		sku: "E2E-IP16-01",
		price: 1000,
		stock: 4,
		images: [],
		categoryId: "e2e-category",
		category: { name: "Phones", slug: "phones" },
		variants: [],
	}
	await page.route("**/api/products**", async (route) => {
		const query = new URL(route.request().url()).searchParams.get("q")?.toLowerCase() || ""
		const products = !query || product.name.toLowerCase().includes(query) ? [product] : []
		await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ products, total: products.length, page: 1, totalPages: products.length ? 1 : 0 }) })
	})
	await page.goto("/products", { waitUntil: "domcontentloaded" })
	await expect(page.getByRole("heading", { name: /all products/i })).toBeVisible()
	const search = page.getByPlaceholder(/search products/i).first()
	await expect(page.getByText("iPhone 16 E2E Test", { exact: true })).toBeVisible()
	await search.fill("not-a-real-item")
	await expect(page.getByRole("heading", { name: /no products found/i })).toBeVisible()
	await search.fill("iphone")
	await expect(page.getByText("iPhone 16 E2E Test", { exact: true })).toBeVisible()

	await page.goto("/checkout", { waitUntil: "domcontentloaded" })
	await expect(page.getByRole("dialog", { name: /authentication required/i })).toBeVisible()
	await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible()
	await expect(page.getByRole("link", { name: /sign up/i })).toHaveAttribute("href", /checkout/)
})

test("auth portals, protected workspace redirects, and platform mobile navigation work", async ({ page }) => {
	await page.goto("/admin/dashboard", { waitUntil: "domcontentloaded" })
	await expect(page).toHaveURL(/\/auth\/signin\?.*portal=admin/)
	await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible()
	await expect(page.getByRole("status")).toContainText(/sign in to continue to admin access/i)
	await page.getByRole("link", { name: /sign up/i }).click()
	await expect(page).toHaveURL(/\/auth\/signup\?/, { timeout: 15000 })
	await expect(page.getByRole("heading", { name: /create an account/i })).toBeVisible({ timeout: 15000 })
	await page.getByPlaceholder("John Doe").fill("Audit User")
	await page.getByPlaceholder("you@example.com").fill("audit-user@example.com")
	await page.getByPlaceholder("Min. 8 characters").fill("AuditPassword1")
	await page.getByPlaceholder("Repeat your password").fill("AuditPassword1")
	await page.getByRole("button", { name: "Create Account" }).click()
	await expect(page.getByText(/please agree to the terms and conditions, privacy policy, and cookie policy first/i)).toBeVisible()

	await page.goto("/manage/settings", { waitUntil: "domcontentloaded" })
	await expect(page).toHaveURL(/\/auth\/signin\?.*portal=manage/)
	await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible()
	await expect(page.getByRole("status")).toContainText(/sign in to continue to store management/i)

	await page.setViewportSize({ width: 390, height: 844 })
	await page.goto("/?platformHome=1", { waitUntil: "domcontentloaded" })
	await page.getByRole("button", { name: /open navigation menu/i }).click()
	const mobileMenu = page.locator("#site-mobile-menu")
	await expect(mobileMenu.getByRole("link", { name: "Home" })).toBeVisible()
	await expect(mobileMenu.getByRole("link", { name: "Plans" })).toBeVisible()
	await page.getByRole("button", { name: /close navigation menu/i }).click()
	await expect(mobileMenu).toBeHidden()
})

test("payment verification and webhook sandbox contracts respond", async ({ request }) => {
	test.skip(!process.env.E2E_PAYMENT_PROVIDER, "Set E2E_PAYMENT_PROVIDER=mpesa or stripe for provider sandbox verification")
	const provider = process.env.E2E_PAYMENT_PROVIDER
	const verify = provider === "mpesa" ? "/api/payments/mpesa/verify" : "/api/payments/card/verify"
	const response = await request.post(verify, { data: { reference: `e2e-${Date.now()}` } })
	expect([200, 400]).toContain(response.status())
	const payload = await response.json()
	expect(payload).toHaveProperty("status")

	const webhook = await request.post("/api/payments/webhooks/mpesa/stk-callback", { data: { Body: { stkCallback: { CheckoutRequestID: `e2e-${Date.now()}`, ResultCode: 1032, ResultDesc: "Cancelled" } } } })
	expect(webhook.status()).toBe(200)
})
