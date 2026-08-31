import { NextRequest, NextResponse } from "next/server"
import { handleMpesaC2B } from "backend/payments/webhooks"
import type { MpesaC2BPayload } from "backend/types/payments"

export async function POST(req: NextRequest) {
	try {
		const payload = (await req.json()) as MpesaC2BPayload
		const result = await handleMpesaC2B(payload, { strictReconciliation: true })
		if (!result.received) return new NextResponse("Invalid callback", { status: 400 })

		// Daraja C2B validation/confirmation expects a plain text response
		return new NextResponse("Success", {
			status: 200,
			headers: { "Content-Type": "text/plain" },
		})
	} catch (error: unknown) {
		console.error("M-Pesa C2B callback error:", error)
		return new NextResponse("Error", {
			status: 500,
			headers: { "Content-Type": "text/plain" },
		})
	}
}
