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
if (process.env.NODE_ENV === "production" && configuredProviders.length === 0) {
	console.error("Production requires one complete payment provider configuration (M-Pesa or Stripe).")
	process.exitCode = 1
}

if (!process.env.NEXT_PUBLIC_R2_PUBLIC_URL) {
	console.warn("NEXT_PUBLIC_R2_PUBLIC_URL is not configured; uploaded product images will not have a public URL.")
}

if (process.exitCode) process.exit()
console.log(`Environment check passed${configuredProviders.length ? `; providers: ${configuredProviders.map(([name]) => name).join(", ")}` : ". No payment provider configured."}`)
