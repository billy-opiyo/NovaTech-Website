import { test, expect } from "@playwright/test"

test("catalog search and checkout form are browser-accessible", async ({ page }) => {
	await page.goto("/products")
	await expect(page.getByRole("heading", { name: /all products/i })).toBeVisible()
	const search = page.getByPlaceholder(/search products/i).first()
	await search.fill("iphone")
	await expect(page.locator("body")).toContainText(/iphone|no products/i)

	await page.goto("/checkout")
	await expect(page.locator("body")).toContainText(/checkout|cart is empty/i)
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
