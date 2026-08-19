import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import * as productService from "../services/productService"
import { productSchema } from "../validators/productValidator"
import { createActionRecord } from "../actions"
import { resolveTenantFromRequest } from "../lib/tenant"
import { requireMembership } from "../lib/tenant-access"
import { MembershipRole } from "@prisma/client"

export async function getProducts(req: NextRequest) {
	try {
		const url = new URL(req.url)
		const searchParams = url.searchParams
		const context = await resolveTenantFromRequest(req)
		const result = await productService.getFilteredProducts(searchParams, context.tenantId)
		return NextResponse.json(result)
	} catch (error: any) {
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}

export async function getProductBySlug(req: NextRequest, slug: string) {
	try {
		const context = await resolveTenantFromRequest(req)
		const product = await productService.getProductBySlug(slug, context.tenantId)
		if (!product) {
			return NextResponse.json(
				{ message: "Product not found" },
				{ status: 404 },
			)
		}
		return NextResponse.json(product)
	} catch (error: any) {
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}

export async function createProduct(req: NextRequest) {
	try {
		const session = await getServerSession()
		if (!session?.user?.id) {
			return NextResponse.json({ message: "Forbidden" }, { status: 403 })
		}
		const context = await resolveTenantFromRequest(req)
		await requireMembership(session.user.id, context.tenantId, [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER, MembershipRole.STORE_EDITOR])

		const body = await req.json()
		const validated = productSchema.parse(body)
		const product = await productService.createProduct(validated, context.tenantId)
		return NextResponse.json(product, { status: 201 })
	} catch (error: any) {
		return NextResponse.json({ message: error.message }, { status: 400 })
	}
}

export async function searchProducts(req: NextRequest) {
	try {
		const url = new URL(req.url)
		const query = url.searchParams.get("q") || ""
		const context = await resolveTenantFromRequest(req)
		const results = await productService.searchProducts(query, context.tenantId)
		return NextResponse.json(results)
	} catch (error: any) {
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}

export async function updateProduct(req: NextRequest, slug: string) {
	try {
		const session = await getServerSession()
		if (!session?.user?.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 })
		const context = await resolveTenantFromRequest(req)
		await requireMembership(session.user.id, context.tenantId, [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN, MembershipRole.STORE_MANAGER, MembershipRole.STORE_EDITOR])
		const body = await req.json()
		const product = await productService.updateProduct(slug, body, context.tenantId)
		await createActionRecord("UPDATED_PRODUCT", { adminId: session.user.id, productId: product.id })
		return NextResponse.json(product)
	} catch (error: any) { return NextResponse.json({ message: error.message }, { status: 400 }) }
}

export async function deleteProduct(req: NextRequest, slug: string) {
	try {
		const session = await getServerSession()
		if (!session?.user?.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 })
		const context = await resolveTenantFromRequest(req)
		await requireMembership(session.user.id, context.tenantId, [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN])
		const product = await productService.deleteProduct(slug, context.tenantId)
		await createActionRecord("DELETED_PRODUCT", { adminId: session.user.id, productId: product.id })
		return NextResponse.json({ ok: true })
	} catch (error: any) { return NextResponse.json({ message: error.message }, { status: 400 }) }
}
