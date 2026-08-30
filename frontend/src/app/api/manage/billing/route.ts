import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireMembership, requireStorePermission } from "backend/lib/tenant-access"
import {
	BillingError,
	cancelSubscription,
	createCustomerPortalSession,
	createMpesaInvoicePayment,
	createSetupFeeMpesaPayment,
	createStripeCheckoutSession,
	changeSubscriptionPlan,
	getBillingSnapshot,
	listActiveAddons,
	listActivePlans,
	subscribeToAddon,
	unsubscribeFromAddon,
} from "backend/billing/service"
import { isMpesaConfigured } from "backend/lib/daraja"

const actionSchema = z.discriminatedUnion("action", [
	z.object({ action: z.literal("checkout"), planKey: z.string().min(1), addonKeys: z.array(z.string()).max(20).default([]) }),
	z.object({ action: z.literal("change_plan"), planKey: z.string().min(1) }),
	z.object({ action: z.literal("cancel"), immediate: z.boolean().default(false) }),
	z.object({ action: z.literal("renew_mpesa"), phone: z.string().min(9).max(15) }),
	z.object({ action: z.literal("setup_mpesa"), phone: z.string().min(9).max(15) }),
	z.object({ action: z.literal("portal") }),
	z.object({ action: z.literal("addon_subscribe"), addonKey: z.string().min(1) }),
	z.object({ action: z.literal("addon_unsubscribe"), addonKey: z.string().min(1) }),
])

async function getAccess() {
	const session = await auth()
	if (!session?.user?.id || !session.user.email) throw new BillingError("Authentication required", 401, "AUTH_REQUIRED")
	const context = await resolveTenantFromRequest({ headers: await (await import("next/headers")).headers() }, { allowUnpublished: true })
	const membership = await requireMembership(session.user.id, context.tenantId)
	return { session, context, membership }
}

export async function GET() {
	try {
		const { context } = await getAccess()
		const [snapshot, plans, addons] = await Promise.all([getBillingSnapshot(context.tenantId), listActivePlans(), listActiveAddons()])
		const paymentMethod = {
			provider: "mpesa" as const,
			configured: isMpesaConfigured(),
			shortcode: process.env.MPESA_SHORTCODE || "",
			env: process.env.MPESA_ENV === "production" ? "production" : "sandbox",
		}
		return NextResponse.json({ ...snapshot, paymentMethod, plans, addons })
	} catch (error: any) {
		console.error("Billing status unavailable", error)
		return NextResponse.json({ message: error instanceof BillingError ? error.message : "Billing status unavailable" }, { status: error?.status || 503 })
	}
}

export async function POST(request: NextRequest) {
	try {
		const { session, context } = await getAccess()
		const parsed = actionSchema.safeParse(await request.json())
		if (!parsed.success) return NextResponse.json({ message: "Invalid billing action", issues: parsed.error.flatten() }, { status: 400 })
		if (["checkout", "change_plan", "cancel", "renew_mpesa", "setup_mpesa", "portal", "addon_subscribe", "addon_unsubscribe"].includes(parsed.data.action)) {
			await requireStorePermission(session.user.id, context.tenantId, "MANAGE_BILLING")
		}
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
		const email = session.user.email as string
		switch (parsed.data.action) {
			case "checkout":
				return NextResponse.json(await createStripeCheckoutSession({ tenantId: context.tenantId, ownerUserId: session.user.id, email, planKey: parsed.data.planKey, addonKeys: parsed.data.addonKeys, successUrl: `${baseUrl}/manage/billing?checkout=success`, cancelUrl: `${baseUrl}/manage/billing?checkout=cancelled` }), { status: 201 })
			case "change_plan":
				return NextResponse.json(await changeSubscriptionPlan({ tenantId: context.tenantId, ownerUserId: session.user.id, email, planKey: parsed.data.planKey, successUrl: `${baseUrl}/manage/billing?checkout=success`, cancelUrl: `${baseUrl}/manage/billing?checkout=cancelled` }), { status: 201 })
			case "cancel":
				return NextResponse.json({ subscription: await cancelSubscription(context.tenantId, parsed.data.immediate) })
			case "renew_mpesa":
				return NextResponse.json(await createMpesaInvoicePayment({ tenantId: context.tenantId, ownerUserId: session.user.id, phone: parsed.data.phone }))
			case "setup_mpesa":
				return NextResponse.json(await createSetupFeeMpesaPayment({ tenantId: context.tenantId, ownerUserId: session.user.id, phone: parsed.data.phone }))
			case "portal":
				return NextResponse.json(await createCustomerPortalSession(context.tenantId, `${baseUrl}/manage/billing`))
			case "addon_subscribe":
				return NextResponse.json({ addon: await subscribeToAddon(context.tenantId, parsed.data.addonKey), message: "The add-on is queued and will activate after the next successful M-Pesa invoice payment." }, { status: 201 })
			case "addon_unsubscribe":
				return NextResponse.json({ addon: await unsubscribeFromAddon(context.tenantId, parsed.data.addonKey) })
		}
	} catch (error: any) {
		console.error("Billing action failed", error)
		return NextResponse.json({ message: error instanceof BillingError ? error.message : error?.message || "Billing action failed" }, { status: error?.status || 500 })
	}
}
