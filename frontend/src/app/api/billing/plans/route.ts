import { NextResponse } from "next/server"
import { listActiveAddons } from "backend/billing/service"
import { getCachedMvpPilotDays } from "@/lib/public-pilot-policy.server"
import { getCachedPublicPlans } from "@/lib/public-plans.server"

export async function GET() {
	try {
		const [planCatalog, addons, pilotDays] = await Promise.all([getCachedPublicPlans(), listActiveAddons(), getCachedMvpPilotDays()])
		return NextResponse.json({ plans: planCatalog.plans, addons, pilotDays })
	} catch (error) {
		console.error("Billing catalog unavailable", error)
		return NextResponse.json({ message: "Billing catalog unavailable" }, { status: 503 })
	}
}
