import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { isPlatformAdmin } from "backend/lib/platform-access"
import { getPlatformStore, isPlatformOwnedStore } from "backend/lib/platform-store"
import { productUpdateSchema } from "backend/validators/productValidator"
import { updateProduct, deleteProduct } from "backend/services/productService"
import { apiErrorResponse } from "backend/lib/api-handler"
import { supplierProductSchema } from "../../supplier-schema"

async function access() {
	const session = await auth()
	if (!session?.user?.id) return { response: NextResponse.json({ message: "Authentication required" }, { status: 401 }) }
	if (!isPlatformAdmin(session)) return { response: NextResponse.json({ message: "Platform administrator access required" }, { status: 403 }) }
	const store = await getPlatformStore()
	if (!isPlatformOwnedStore(store) || store?.tenant.kind !== "PLATFORM") return { response: NextResponse.json({ message: "The platform-owned store has not been provisioned." }, { status: 404 }) }
	return { session, store }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
	const result = await access()
	if ("response" in result) return result.response
	const { id } = await context.params
	const body = await request.json().catch(() => null)
	const parsedProduct = productUpdateSchema.safeParse(body?.product)
	const parsedSupplier = body?.supplierProduct === null ? null : body?.supplierProduct === undefined ? undefined : supplierProductSchema.safeParse(body.supplierProduct)
	if (!parsedProduct.success) return NextResponse.json({ message: "Invalid product update", issues: parsedProduct.error.flatten() }, { status: 400 })
	if (parsedSupplier && !parsedSupplier.success) return NextResponse.json({ message: "Invalid supplier product details", issues: parsedSupplier.error.flatten() }, { status: 400 })
	const existing = await prisma.product.findFirst({ where: { id, tenantId: result.store.tenantId, storeId: result.store.id }, select: { slug: true } })
	if (!existing) return NextResponse.json({ message: "Product not found" }, { status: 404 })
	try {
		const product = await updateProduct(existing.slug, parsedProduct.data, result.store.tenantId)
		if (parsedSupplier === null) await prisma.supplierProduct.deleteMany({ where: { productId: product.id, storeId: result.store.id } })
		else if (parsedSupplier?.success) {
			const supplier = await prisma.supplier.findFirst({ where: { id: parsedSupplier.data.supplierId, storeId: result.store.id, active: true }, select: { id: true } })
			if (!supplier) return NextResponse.json({ message: "Select an active supplier for this platform store." }, { status: 400 })
			await prisma.supplierProduct.upsert({ where: { productId: product.id }, update: { storeId: result.store.id, ...parsedSupplier.data }, create: { storeId: result.store.id, productId: product.id, ...parsedSupplier.data } })
		}
		return NextResponse.json({ product: { id: product.id, name: product.name, slug: product.slug } })
	} catch (error) { return apiErrorResponse(error, "Product could not be updated") }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
	const result = await access()
	if ("response" in result) return result.response
	const { id } = await context.params
	const existing = await prisma.product.findFirst({ where: { id, tenantId: result.store.tenantId, storeId: result.store.id }, select: { slug: true } })
	if (!existing) return NextResponse.json({ message: "Product not found" }, { status: 404 })
	try {
		await deleteProduct(existing.slug, result.store.tenantId)
		return NextResponse.json({ deleted: true })
	} catch (error) { return apiErrorResponse(error, "Product could not be deleted") }
}
