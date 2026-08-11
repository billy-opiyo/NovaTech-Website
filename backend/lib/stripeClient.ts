import Stripe from "stripe"

const globalForStripe = globalThis as unknown as { stripe: Stripe | null }

export function isStripeConfigured(): boolean {
	return Boolean(process.env.STRIPE_SECRET_KEY)
}

export function getStripeClient(): Stripe {
	if (globalForStripe.stripe) return globalForStripe.stripe

	const secretKey = process.env.STRIPE_SECRET_KEY
	if (!secretKey) {
		throw new Error("STRIPE_SECRET_KEY is not configured")
	}

	globalForStripe.stripe = new Stripe(secretKey, {
		apiVersion: "2026-07-29.dahlia",
	})
	return globalForStripe.stripe
}

export function getStripeWebhookSecret(): string | null {
	return process.env.STRIPE_WEBHOOK_SECRET || null
}