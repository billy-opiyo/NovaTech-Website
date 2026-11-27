import { NextRequest, NextResponse } from "next/server"
import { apiErrorResponse } from "backend/lib/api-handler"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { getCachedProductBySlug, revalidateTenantPublicCatalog } from "@/lib/public-catalog.server"
import { updateProduct, deleteProduct } from "backend/controllers/productController"

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ slug: string }> },
) {
	try {
		const context = await resolveTenantFromRequest(req, { includeCommerceSettings: true })
		const product = await getCachedProductBySlug((await params).slug, context)
		return product ? NextResponse.json(product) : NextResponse.json({ message: "Product not found" }, { status: 404 })
	} catch (error: unknown) {
		return apiErrorResponse(error, "Product unavailable")
	}
}

async function invalidateAfterMutation(request: NextRequest) {
	try {
		const context = await resolveTenantFromRequest(request, { allowUnpublished: true })
		revalidateTenantPublicCatalog(context, { storeDirectory: true, platformDiscovery: true, platformStoreHomepage: true })
	} catch (error: unknown) {
		console.error("Product cache invalidation failed", error)
	}
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
	const response = await updateProduct(req, (await params).slug)
	if (response.ok) await invalidateAfterMutation(req)
	return response
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
	const response = await deleteProduct(req, (await params).slug)
	if (response.ok) await invalidateAfterMutation(req)
	return response
}
