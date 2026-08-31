import { NextRequest, NextResponse } from "next/server"
import { MembershipRole } from "@prisma/client"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireStorePermission } from "backend/lib/tenant-access"
import { merchantQuoteSchema } from "backend/validators/merchantEnquiryValidator"
import { createActionRecord } from "backend/actions"
import { sendEmail } from "backend/lib/email"
import { randomBytes } from "node:crypto"
import { escapeHtml } from "backend/lib/html"
import { apiErrorResponse } from "backend/lib/api-handler"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await auth()
		if (!session?.user?.id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })
		const context = await resolveTenantFromRequest(request, { allowUnpublished: true })
		await requireStorePermission(session.user.id, context.tenantId, "CREATE_QUOTES")
		const { id } = await params
		const parsed = merchantQuoteSchema.safeParse(await request.json().catch(() => ({})))
		if (!parsed.success) return NextResponse.json({ message: "Invalid quote details.", issues: parsed.error.flatten() }, { status: 400 })
		const enquiry = await prisma.merchantEnquiry.findFirst({ where: { id, tenantId: context.tenantId }, select: { id: true, customerName: true, customerEmail: true, items: true, estimatedTotal: true } })
		if (!enquiry) return NextResponse.json({ message: "Enquiry not found." }, { status: 404 })
		const lines = Array.isArray(enquiry.items) ? enquiry.items : []
		const subtotal = Number(enquiry.estimatedTotal || 0)
		const deliveryFee = parsed.data.deliveryFee || 0
		const quoteNumber = `QT-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(3).toString("hex").toUpperCase()}`
		const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null
		const quote = await prisma.$transaction(async (transaction) => {
			const created = await transaction.merchantQuote.create({ data: { tenantId: context.tenantId, enquiryId: enquiry.id, createdById: session.user.id, quoteNumber, status: "SENT", subtotal, deliveryFee, total: subtotal + deliveryFee, lines, terms: parsed.data.terms || null, expiresAt, sentAt: new Date() } })
			await transaction.merchantEnquiry.update({ where: { id: enquiry.id }, data: { status: "QUOTED", quotedAt: new Date() } })
			return created
		})
		await sendEmail({ to: enquiry.customerEmail, subject: `Quote ${quote.quoteNumber} from your merchant`, html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h1>Merchant quote</h1><p>Hi ${escapeHtml(enquiry.customerName)},</p><p>Your quote reference is <strong>${escapeHtml(quote.quoteNumber)}</strong>.</p><p>Subtotal: ${escapeHtml(quote.currency)} ${subtotal.toLocaleString()}<br>Delivery: ${escapeHtml(quote.currency)} ${deliveryFee.toLocaleString()}<br><strong>Total: ${escapeHtml(quote.currency)} ${quote.total.toLocaleString()}</strong></p>${quote.terms ? `<p>${escapeHtml(quote.terms)}</p>` : ""}<p>Please reply to the merchant directly to accept or discuss this quote.</p></div>`}).catch((error) => console.error("Quote email could not be sent:", error))
		await createActionRecord("CREATED_MERCHANT_QUOTE", { tenantId: context.tenantId, adminId: session.user.id, enquiryId: enquiry.id, quoteId: quote.id, quoteNumber }).catch(() => undefined)
		return NextResponse.json({ quote }, { status: 201 })
	} catch (error: unknown) { return apiErrorResponse(error, "Unable to create quote") }
}
