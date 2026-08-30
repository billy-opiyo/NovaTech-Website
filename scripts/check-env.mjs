const required = ["DATABASE_URL", "AUTH_SECRET", "NEXT_PUBLIC_APP_URL"]
const missing = required.filter((name) => !process.env[name])
const providerGroups = [
	["M-Pesa", ["MPESA_CONSUMER_KEY", "MPESA_CONSUMER_SECRET", "MPESA_PASSKEY", "MPESA_SHORTCODE"]],
	["Stripe", ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"]],
]

if (missing.length) {
	console.error(`Missing required environment variables: ${missing.join(", ")}`)
	process.exitCode = 1
}

const configuredProviders = providerGroups.filter(([, names]) => names.every((name) => process.env[name]))
if (process.env.NODE_ENV === "production") {
	if ((process.env.AUTH_SECRET || "").length < 32) {
		console.error("Production AUTH_SECRET must be at least 32 characters.")
		process.exitCode = 1
	}
	try {
		const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL || "")
		if (appUrl.protocol !== "https:") throw new Error("https required")
	} catch {
		console.error("Production NEXT_PUBLIC_APP_URL must be a valid HTTPS URL.")
		process.exitCode = 1
	}
	if (configuredProviders.length === 0) {
		console.error("Production requires one complete payment provider configuration (M-Pesa or Stripe).")
		process.exitCode = 1
	}
	if (process.env.MPESA_ENV === "production" && process.env.MPESA_BUSINESS_NAME !== "Nurava Tech") {
		console.error("Production M-Pesa requires MPESA_BUSINESS_NAME=Nurava Tech after the business is registered.")
		process.exitCode = 1
	}
	if (!["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "NEXT_PUBLIC_R2_PUBLIC_URL"].every((name) => process.env[name])) {
		console.error("Production requires complete R2 storage configuration.")
		process.exitCode = 1
	}
	if (!process.env.RESEND_API_KEY) {
		console.error("Production requires RESEND_API_KEY for transactional email.")
		process.exitCode = 1
	}
}

if (!process.env.NEXT_PUBLIC_R2_PUBLIC_URL) {
	console.warn("NEXT_PUBLIC_R2_PUBLIC_URL is not configured; uploaded product images will not have a public URL.")
}

if (process.exitCode) process.exit()
console.log(`Environment check passed${configuredProviders.length ? `; providers: ${configuredProviders.map(([name]) => name).join(", ")}` : ". No payment provider configured."}`)
