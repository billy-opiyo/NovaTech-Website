import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireStorePermission } from "backend/lib/tenant-access"
import { csvCell } from "backend/lib/catalog-csv"
import { getStoreIndustry } from "backend/lib/industry"
import { apiErrorResponse } from "backend/lib/api-handler"

export async function GET(request: NextRequest) {
	try {
		const session = await auth()
		if (!session?.user?.id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })
		const context = await resolveTenantFromRequest(request, { allowUnpublished: true })
		await requireStorePermission(session.user.id, context.tenantId, "MANAGE_CATALOG")
		const [products, storeIndustry] = await Promise.all([
			prisma.product.findMany({ where: { tenantId: context.tenantId, storeId: context.storeId }, orderBy: { createdAt: "asc" }, include: { category: { select: { name: true, slug: true } }, variants: { where: { tenantId: context.tenantId }, select: { name: true, value: true, priceModifier: true, stock: true, sku: true } }, attributeValues: { include: { definition: { select: { id: true, industryId: true, key: true, active: true } } } } } }),
			getStoreIndustry(context.storeId, context.tenantId),
		])
		const isElectronics = storeIndustry?.industry?.slug === "electronics"
		const headers = ["name", "slug", "description", "brand", "sku", "price", "discountedPrice", "stock", ...(isElectronics ? ["warranty"] : []), "category", "images", "isFeatured", "isNewArrival", "isTrending", ...(isElectronics ? ["specs"] : []), "variants", "attributes"]
		const lines = [headers.join(","), ...products.map((product) => {
			const attributes = Object.fromEntries(product.attributeValues.filter((attribute) => attribute.definition.active && attribute.definition.industryId === storeIndustry?.industry?.id).map((attribute) => [attribute.definition.key, attribute.value]))
			const values: unknown[] = [product.name, product.slug, product.description, product.brand, product.sku, product.price, product.discountedPrice, product.stock]
			if (isElectronics) values.push(product.warranty)
			values.push(product.category.name || product.category.slug, product.images.join("|"), product.isFeatured, product.isNewArrival, product.isTrending)
			if (isElectronics) values.push(product.specs)
			values.push(product.variants, attributes)
			return values.map(csvCell).join(",")
		})]
		return new NextResponse(`${lines.join("\n")}\n`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${context.storeSlug}-catalog.csv"`, "Cache-Control": "no-store" } })
	} catch (error: unknown) { return apiErrorResponse(error, "Catalog export unavailable") }
}
