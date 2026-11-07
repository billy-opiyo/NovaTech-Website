import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { isPlatformAdmin } from "backend/lib/platform-access"
import { getPlatformStore, isPlatformOwnedStore } from "backend/lib/platform-store"
import { productSchema } from "backend/validators/productValidator"
import { createProduct } from "backend/services/productService"
import { apiErrorResponse } from "backend/lib/api-handler"
import { supplierProductSchema } from "./supplier-schema"

const supplierSchema = z.object({
	name: z.string().trim().min(2).max(120),
	contactName: z.string().trim().max(120).optional(),
	email: z.string().trim().email().optional().or(z.literal("")),
	phone: z.string().trim().max(40).optional(),
	notes: z.string().trim().max(2000).optional(),
}).strict()

async function access() {
	const session = await auth()
	if (!session?.user?.id) return { response: NextResponse.json({ message: "Authentication required" }, { status: 401 }) }
	if (!isPlatformAdmin(session)) return { response: NextResponse.json({ message: "Platform administrator access required" }, { status: 403 }) }
	const store = await getPlatformStore()
	if (!isPlatformOwnedStore(store) || store?.tenant.kind !== "PLATFORM") return { response: NextResponse.json({ message: "The platform-owned store has not been provisioned." }, { status: 404 }) }
	return { session, store }
}

export async function GET() {
	const result = await access()
	if ("response" in result) return result.response
	const [categories, industries, suppliers, products] = await Promise.all([
		prisma.category.findMany({ where: { tenantId: result.store.tenantId, storeId: result.store.id, active: true, industry: { is: { active: true } } }, select: { id: true, name: true, slug: true, industryId: true, industry: { select: { id: true, name: true, slug: true } } }, orderBy: [{ industry: { name: "asc" } }, { name: "asc" }] }),
		prisma.industry.findMany({ where: { active: true }, select: { id: true, name: true, slug: true, categoryTemplates: { where: { active: true }, select: { id: true, name: true, slug: true } } }, orderBy: [{ name: "asc" }] }),
		prisma.supplier.findMany({ where: { storeId: result.store.id, active: true }, select: { id: true, name: true, contactName: true, email: true, phone: true, notes: true }, orderBy: { name: "asc" } }),
		prisma.product.findMany({ where: { tenantId: result.store.tenantId, storeId: result.store.id }, select: { id: true, name: true, slug: true, description: true, brand: true, sku: true, price: true, discountedPrice: true, stock: true, images: true, isPublished: true, isFeatured: true, categoryId: true, category: { select: { id: true, name: true, industry: { select: { name: true, slug: true } } } }, supplierProduct: { select: { supplierId: true, supplierReference: true, supplierCost: true, currency: true, availability: true, estimatedDeliveryMinDays: true, estimatedDeliveryMaxDays: true, deliveryNotes: true } } }, orderBy: { createdAt: "desc" }, take: 250 }),
	])
	return NextResponse.json({ store: { id: result.store.id, name: result.store.name, slug: result.store.slug, publicationStatus: result.store.publicationStatus }, categories, industries, suppliers, products })
}

export async function POST(request: Request) {
	const result = await access()
	if ("response" in result) return result.response
	const body = await request.json().catch(() => null)
	if (body?.action === "create_supplier") {
		const parsed = supplierSchema.safeParse(body.supplier)
		if (!parsed.success) return NextResponse.json({ message: "Invalid supplier details", issues: parsed.error.flatten() }, { status: 400 })
		try {
			const supplier = await prisma.supplier.upsert({ where: { storeId_name: { storeId: result.store.id, name: parsed.data.name } }, update: { contactName: parsed.data.contactName || null, email: parsed.data.email || null, phone: parsed.data.phone || null, notes: parsed.data.notes || null, active: true }, create: { storeId: result.store.id, ...parsed.data, email: parsed.data.email || null } })
			return NextResponse.json({ supplier }, { status: 201 })
		} catch (error) { return apiErrorResponse(error, "Supplier could not be saved") }
	}
	if (body?.action !== "create_product") return NextResponse.json({ message: "Choose a supported catalog action." }, { status: 400 })
	const parsedProduct = productSchema.safeParse(body.product)
	const parsedSupplier = body.supplierProduct == null ? null : supplierProductSchema.safeParse(body.supplierProduct)
	if (!parsedProduct.success) return NextResponse.json({ message: "Invalid product details", issues: parsedProduct.error.flatten() }, { status: 400 })
	if (parsedSupplier && !parsedSupplier.success) return NextResponse.json({ message: "Invalid supplier product details", issues: parsedSupplier.error.flatten() }, { status: 400 })
	if (parsedSupplier?.success) {
		const supplier = await prisma.supplier.findFirst({ where: { id: parsedSupplier.data.supplierId, storeId: result.store.id, active: true }, select: { id: true } })
		if (!supplier) return NextResponse.json({ message: "Select an active supplier for this platform store." }, { status: 400 })
	}
	try {
		const product = await createProduct({ ...parsedProduct.data, isPublished: parsedProduct.data.isPublished ?? false }, result.store.tenantId)
		if (parsedSupplier?.success) await prisma.supplierProduct.create({ data: { storeId: result.store.id, productId: product.id, ...parsedSupplier.data } })
		return NextResponse.json({ product: { id: product.id, name: product.name, slug: product.slug } }, { status: 201 })
	} catch (error) { return apiErrorResponse(error, "Product could not be created") }
}
