import { NextRequest, NextResponse } from "next/server"
import { rateLimiter } from "backend/middleware/rateLimiter"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { merchantEnquirySchema } from "backend/validators/merchantEnquiryValidator"

export async function POST(request: NextRequest) {
	const limited = await rateLimiter(request, "merchant-enquiry")
	if (limited) return limited
	try {
		const parsed = merchantEnquirySchema.safeParse(await request.json().catch(() => null))
		if (!parsed.success) return NextResponse.json({ message: "Enter your contact details, accept the enquiry consent, and select at least one product.", issues: parsed.error.flatten() }, { status: 400 })
		const context = await resolveTenantFromRequest(request)
		const session = await auth()
		const products = await prisma.product.findMany({
			where: { tenantId: context.tenantId, id: { in: parsed.data.items.map((item) => item.productId) } },
			select: { id: true, name: true, slug: true, sku: true, price: true, discountedPrice: true },
		})
		const productById = new Map(products.map((product) => [product.id, product]))
		if (products.length !== new Set(parsed.data.items.map((item) => item.productId)).size) return NextResponse.json({ message: "One or more selected products are no longer available in this store." }, { status: 409 })
		const items = parsed.data.items.map((item) => {
			const product = productById.get(item.productId)!
			const unitPrice = product.discountedPrice ?? product.price
			return { productId: product.id, name: product.name, slug: product.slug, sku: product.sku, quantity: item.quantity, variant: item.variant || null, unitPrice, lineTotal: unitPrice * item.quantity }
		})
		const estimatedTotal = items.reduce((total, item) => total + item.lineTotal, 0)
		const enquiry = await prisma.merchantEnquiry.create({
			data: { tenantId: context.tenantId, storeId: context.storeId, userId: session?.user?.id || null, customerName: parsed.data.customerName, customerEmail: parsed.data.customerEmail.toLowerCase(), customerPhone: parsed.data.customerPhone || null, message: parsed.data.message || null, contactMethod: parsed.data.contactMethod, consent: parsed.data.consent, items, estimatedTotal },
			select: { id: true, status: true, estimatedTotal: true, createdAt: true },
		})
		return NextResponse.json({ enquiry }, { status: 201 })
	} catch (error: any) {
		return NextResponse.json({ message: error?.status ? error.message : "Unable to save this enquiry right now." }, { status: error?.status || 503 })
	}
}
