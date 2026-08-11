import prisma from "../../lib/db"
import {
	isMpesaConfigured,
	normalizePhone,
	stkPush,
	stkQuery,
	generatePassword,
} from "../../lib/daraja"
import type {
	MpesaInitiateResult,
	MpesaVerifyResult,
} from "../../types/payments"

export type MpesaPayload = {
	amount: number
	phone: string
	reference: string
	orderId?: string
	metadata?: Record<string, unknown>
}

export interface MpesaInitiateInput extends MpesaPayload {
	callbackUrl?: string
}

export async function initiateMpesaPayment({
	amount,
	phone,
	reference,
	orderId,
	metadata,
	callbackUrl,
}: MpesaInitiateInput): Promise<MpesaInitiateResult> {
	if (!isMpesaConfigured()) {
		return {
			ok: false,
			provider: "mpesa",
			reference,
			checkoutRequestId: "",
			phone,
			amount,
			currency: "KES",
			status: "FAILED",
			message:
				"M-Pesa is not configured. Set MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_PASSKEY and MPESA_SHORTCODE.",
		}
	}

	if (amount <= 0) {
		throw new Error("Amount must be greater than zero")
	}

	const normalizedPhone = normalizePhone(phone)

	const callback =
		callbackUrl ||
		`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/payments/webhooks/mpesa/stk-callback`

	const response = (await stkPush({
		amount,
		phone: normalizedPhone,
		accountReference: reference.slice(0, 12),
		callbackUrl: callback,
	})) as {
		MerchantRequestID: string
		CheckoutRequestID: string
		ResponseCode: string
		ResponseDescription: string
		CustomerMessage: string
	}

	const payment = await prisma.payment.create({
		data: {
			orderId,
			provider: "mpesa",
			amount,
			currency: "KES",
			status: "PENDING",
			providerReference: response.CheckoutRequestID,
			phoneNumber: normalizedPhone,
			metadata: {
				reference,
				merchantRequestId: response.MerchantRequestID,
				...(metadata || {}),
			},
		},
	})

	return {
		ok: response.ResponseCode === "0",
		provider: "mpesa",
		reference,
		checkoutRequestId: response.CheckoutRequestID,
		merchantRequestId: response.MerchantRequestID,
		phone: normalizedPhone,
		amount,
		currency: "KES",
		status: "PENDING",
		message: response.ResponseDescription || response.CustomerMessage,
		metadata: {
			paymentId: payment.id,
			responseCode: response.ResponseCode,
		},
	}
}

export async function verifyMpesaPayment(
	reference: string,
): Promise<MpesaVerifyResult> {
	if (!isMpesaConfigured()) {
		return {
			ok: false,
			provider: "mpesa",
			reference,
			status: "FAILED",
			checkoutRequestId: reference,
			message:
				"M-Pesa is not configured. Set MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_PASSKEY and MPESA_SHORTCODE.",
		}
	}

	const payment = await prisma.payment.findFirst({
		where: {
			OR: [
				{ providerReference: reference },
				{ metadata: { path: ["reference"], equals: reference } },
			],
		},
	})

	const checkoutRequestId = payment?.providerReference || reference

	const response = (await stkQuery({
		checkoutRequestId,
	})) as {
		ResponseCode: string
		ResponseDescription: string
		ResultCode?: number
		ResultDesc?: string
	}

	const resultCode = response.ResultCode ?? 0
	const completed = resultCode === 0

	const status = completed ? "COMPLETED" : "FAILED"

	if (payment) {
		await prisma.payment.update({
			where: { id: payment.id },
			data: {
				status,
				metadata: {
					...(payment.metadata as Record<string, unknown> | undefined),
					verifyResponseCode: response.ResponseCode,
					verifyResultCode: resultCode,
					verifyResultDesc: response.ResultDesc,
				},
			},
		})

		if (completed && payment.orderId) {
			await prisma.order.update({
				where: { id: payment.orderId },
				data: { status: "CONFIRMED" },
			})
		}
	}

	return {
		ok: completed,
		provider: "mpesa",
		reference,
		checkoutRequestId,
		status,
		resultCode,
		resultDescription: response.ResultDesc || response.ResponseDescription,
		message: completed
			? "M-Pesa payment completed successfully."
			: `M-Pesa payment failed: ${response.ResultDesc || response.ResponseDescription}`,
	}
}

export async function simulateMpesaPayment({
	amount,
	phone,
	reference,
}: MpesaPayload): Promise<{
	ok: boolean
	provider: "mpesa"
	message: string
}> {
	if (!isMpesaConfigured()) {
		return {
			ok: false,
			provider: "mpesa",
			message: "M-Pesa sandbox simulation requires M-Pesa credentials.",
		}
	}

	const { c2bSimulate } = await import("../../lib/daraja")
	await c2bSimulate({
		amount,
		phone,
		accountReference: reference.slice(0, 12),
	})

	return {
		ok: true,
		provider: "mpesa",
		message: "M-Pesa payment simulation triggered successfully.",
	}
}

export function generateTimestamp(): string {
	const { timestamp } = generatePassword(
		process.env.MPESA_SHORTCODE || "174379",
		process.env.MPESA_PASSKEY || "",
	)
	return timestamp
}