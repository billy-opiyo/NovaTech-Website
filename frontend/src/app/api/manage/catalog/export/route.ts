import { NextRequest, NextResponse } from "next/server"
import { MembershipRole } from "@prisma/client"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireStorePermission } from "backend/lib/tenant-access"
import { csvCell } from "backend/lib/catalog-csv"
import { apiErrorResponse } from "backend/lib/api-handler"

export async function GET(request: NextRequest) {
	try {
		const session = await auth()
		if (!session?.user?.id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })
		const context = await resolveTenantFromRequest(request, { allowUnpublished: true })
		await requireStorePermission(session.user.id, context.tenantId, "MANAGE_CATALOG")
		const products = await prisma.product.findMany({ where: { tenantId: context.tenantId }, orderBy: { createdAt: "asc" }, include: { category: { select: { name: true, slug: true } }, variants: { where: { tenantId: context.tenantId }, select: { name: true, value: true, priceModifier: true, stock: true, sku: true } } } })
		const headers = ["name", "slug", "description", "brand", "sku", "price", "discountedPrice", "stock", "warranty", "category", "images", "isFeatured", "isNewArrival", "specs", "variants"]
		const lines = [headers.join(","), ...products.map((product) => [product.name, product.slug, product.description, product.brand, product.sku, product.price, product.discountedPrice, product.stock, product.warranty, product.category.name || product.category.slug, product.images.join("|"), product.isFeatured, product.isNewArrival, product.specs, product.variants].map(csvCell).join(","))]
		return new NextResponse(`${lines.join("\n")}\n`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${context.storeSlug}-catalog.csv"`, "Cache-Control": "no-store" } })
	} catch (error: unknown) { return apiErrorResponse(error, "Catalog export unavailable") }
}
