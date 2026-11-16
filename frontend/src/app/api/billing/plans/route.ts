import { NextResponse } from "next/server"
import { listActivePlans, listActiveAddons } from "backend/billing/service"
import { getMvpPilotDays } from "backend/billing/mvp-policy"

export async function GET() {
	try {
		const [plans, addons, pilotDays] = await Promise.all([listActivePlans(), listActiveAddons(), getMvpPilotDays()])
		return NextResponse.json({ plans, addons, pilotDays })
	} catch (error) {
		console.error("Billing catalog unavailable", error)
		return NextResponse.json({ message: "Billing catalog unavailable" }, { status: 503 })
	}
}
