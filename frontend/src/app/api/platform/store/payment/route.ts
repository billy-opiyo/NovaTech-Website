import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { isPlatformAdmin } from "backend/lib/platform-access"
import { encryptMerchantPaymentDetails } from "backend/lib/merchant-verification-secrets"
import { getPlatformStorePaymentSummary } from "backend/payments/platform-store"

const configSchema = z.object({
	provider: z.enum(["MPESA", "STRIPE"]),
	accountType: z.enum(["PAYBILL", "TILL"]).optional(),
	accountNumber: z.string().trim().max(30).optional(),
	accountName: z.string().trim().max(120).optional(),
	consumerKey: z.string().trim().max(500).optional(),
	consumerSecret: z.string().trim().max(500).optional(),
	passkey: z.string().trim().max(500).optional(),
	enabled: z.boolean(),
	authorizedAccountConfirmed: z.boolean().optional(),
}).strict()

async function access() {
	const session = await auth()
	if (!session?.user?.id) return { response: NextResponse.json({ message: "Authentication required" }, { status: 401 }) }
	if (!isPlatformAdmin(session)) return { response: NextResponse.json({ message: "Platform administrator access required" }, { status: 403 }) }
	return { session }
}

export async function GET() {
	const result = await access()
	if ("response" in result) return result.response
	return NextResponse.json(await getPlatformStorePaymentSummary())
}

export async function PATCH(request: Request) {
	const result = await access()
	if ("response" in result) return result.response
	const parsed = configSchema.safeParse(await request.json().catch(() => null))
	if (!parsed.success) return NextResponse.json({ message: "Invalid platform store payment settings", issues: parsed.error.flatten() }, { status: 400 })
	const data = parsed.data
	const canAuthorize = result.session.user.role === "SUPERADMIN" || result.session.user.platformRole === "PLATFORM_OWNER"
	if (data.enabled && (!canAuthorize || data.authorizedAccountConfirmed !== true)) return NextResponse.json({ message: "A Platform Owner must confirm that the selected account is approved for platform store product sales before enabling payments." }, { status: 403 })
	if (data.provider === "STRIPE" && (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET)) return NextResponse.json({ message: "Stripe server and webhook credentials must be configured before activation." }, { status: 409 })
	if (data.provider === "MPESA") {
		if (!data.accountType || !data.accountNumber || !/^\d{5,10}$/.test(data.accountNumber.replace(/\D/g, ""))) return NextResponse.json({ message: "Enter the approved PayBill or Till type and shortcode." }, { status: 400 })
		if (!data.consumerKey || !data.consumerSecret || !data.passkey) return NextResponse.json({ message: "Provide all M-Pesa credentials to configure this designated collection route." }, { status: 400 })
	}
	const existing = await prisma.platformStorePaymentConfiguration.findUnique({ where: { id: "platform-store" } })
	let credentialsCiphertext = existing?.credentialsCiphertext || null
	if (data.provider === "MPESA") {
		credentialsCiphertext = encryptMerchantPaymentDetails({ consumerKey: data.consumerKey!, consumerSecret: data.consumerSecret!, passkey: data.passkey! })
	}
	const config = await prisma.platformStorePaymentConfiguration.upsert({
		where: { id: "platform-store" },
		update: { provider: data.provider, accountType: data.provider === "MPESA" ? data.accountType : null, accountNumber: data.provider === "MPESA" ? data.accountNumber!.replace(/\D/g, "") : null, accountName: data.provider === "MPESA" ? data.accountName || null : null, credentialsCiphertext, enabled: data.enabled, authorizedAt: data.enabled ? new Date() : null, authorizedById: data.enabled ? result.session.user.id : null },
		create: { id: "platform-store", provider: data.provider, accountType: data.provider === "MPESA" ? data.accountType : null, accountNumber: data.provider === "MPESA" ? data.accountNumber!.replace(/\D/g, "") : null, accountName: data.provider === "MPESA" ? data.accountName || null : null, credentialsCiphertext, enabled: data.enabled, authorizedAt: data.enabled ? new Date() : null, authorizedById: data.enabled ? result.session.user.id : null },
	})
	return NextResponse.json({ provider: config.provider, accountType: config.accountType, accountNumber: config.accountNumber, accountName: config.accountName, enabled: config.enabled, authorizedAt: config.authorizedAt, credentialsConfigured: Boolean(config.credentialsCiphertext) })
}
