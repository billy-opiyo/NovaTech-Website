import { isMpesaConfigured } from "../lib/daraja"
import { isStripeConfigured } from "../lib/stripeClient"

export interface PaymentsConfig {
	mpesa: {
		configured: boolean
		env: "sandbox" | "production"
	}
	stripe: {
		configured: boolean
	}
}

export function getPaymentsConfig(): PaymentsConfig {
	return {
		mpesa: {
			configured: isMpesaConfigured(),
			env: process.env.MPESA_ENV === "production" ? "production" : "sandbox",
		},
		stripe: {
			configured: isStripeConfigured(),
		},
	}
}