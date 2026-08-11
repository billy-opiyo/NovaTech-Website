import { NextRequest, NextResponse } from "next/server"
import { handleMpesaStkCallback } from "backend/payments/webhooks"
import type { MpesaStkCallbackPayload } from "backend/types/payments"

export async function POST(req: NextRequest) {
	try {
		const payload = (await req.json()) as MpesaStkCallbackPayload
		await handleMpesaStkCallback(payload)

		// Daraja requires a plain text "Success" response for STK callbacks
		return new NextResponse("Success", {
			status: 200,
			headers: { "Content-Type": "text/plain" },
		})
	} catch (error: any) {
		console.error("M-Pesa STK callback error:", error)
		return new NextResponse("Error", {
			status: 500,
			headers: { "Content-Type": "text/plain" },
		})
	}
}