import { NextResponse } from "next/server"
import { listActivePlans, listActiveAddons } from "backend/billing/service"

export async function GET() {
	try {
		const [plans, addons] = await Promise.all([listActivePlans(), listActiveAddons()])
		return NextResponse.json({ plans, addons })
	} catch (error) {
		console.error("Billing catalog unavailable", error)
		return NextResponse.json({ message: "Billing catalog unavailable" }, { status: 503 })
	}
}
