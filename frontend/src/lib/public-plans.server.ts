import { listActivePlans } from "backend/billing/service"

export type PublicPlan = {
	id: string
	key: string
	name: string
	price: number | null
	currency: string
	billingInterval: "MONTH" | "YEAR" | null
	setupFeeAmount: number
	transactionFeePercent: number
	entitlements: Record<string, unknown>
}

export type PublicPlanCatalogSource = "database" | "approved-config"

const approvedPlanCatalog: PublicPlan[] = [
	{
		id: "approved-starter",
		key: "STARTER",
		name: "Starter",
		price: 1500,
		currency: "KES",
		billingInterval: "MONTH",
		setupFeeAmount: 5000,
		transactionFeePercent: 0,
		entitlements: { productLimit: 50, staffAccounts: 3, storageGb: 2, analyticsLevel: "basic", customDomain: false, whatsappNotifications: false },
	},
	{
		id: "approved-business",
		key: "BUSINESS",
		name: "Business",
		price: 3500,
		currency: "KES",
		billingInterval: "MONTH",
		setupFeeAmount: 5000,
		transactionFeePercent: 0,
		entitlements: { productLimit: 250, staffAccounts: 15, storageGb: 10, analyticsLevel: "advanced", customDomain: true, whatsappNotifications: false },
	},
	{
		id: "approved-enterprise",
		key: "ENTERPRISE",
		name: "Enterprise",
		price: 8500,
		currency: "KES",
		billingInterval: "MONTH",
		setupFeeAmount: 1500,
		transactionFeePercent: 0,
		entitlements: { productLimit: 1000, staffAccounts: 100, storageGb: 50, analyticsLevel: "advanced", customDomain: true, customDomainCount: 5, whatsappNotifications: false },
	},
]

export async function getPublicPlans(): Promise<{ plans: PublicPlan[]; unavailable: boolean; source: PublicPlanCatalogSource }> {
	try {
		const plans = (await listActivePlans()).filter((plan) => ["STARTER", "BUSINESS", "ENTERPRISE"].includes(plan.key))
		if (!plans.length) return { plans: approvedPlanCatalog, unavailable: false, source: "approved-config" }
		return {
			plans: plans.map((plan) => ({
				id: plan.id,
				key: plan.key,
				name: plan.name,
				price: plan.price,
				currency: plan.currency,
				billingInterval: plan.billingInterval,
				setupFeeAmount: plan.setupFeeAmount,
				transactionFeePercent: plan.transactionFeePercent,
				entitlements: plan.entitlementsJson && typeof plan.entitlementsJson === "object" && !Array.isArray(plan.entitlementsJson)
					? plan.entitlementsJson as Record<string, unknown>
					: {},
			})),
			unavailable: false,
			source: "database",
		}
	} catch (error) {
		console.error("Public plan catalog unavailable", error)
		return { plans: approvedPlanCatalog, unavailable: false, source: "approved-config" }
	}
}
