import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import * as productService from "../services/productService"
import { productSchema } from "../validators/productValidator"

export async function getProducts(req: NextRequest) {
	try {
		const url = new URL(req.url)
		const searchParams = url.searchParams
		const result = await productService.getFilteredProducts(searchParams)
		return NextResponse.json(result)
	} catch (error: any) {
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}

export async function getProductBySlug(slug: string) {
	try {
		const product = await productService.getProductBySlug(slug)
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
		if (
			!session?.user ||
			(session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")
		) {
			return NextResponse.json({ message: "Forbidden" }, { status: 403 })
		}

		const body = await req.json()
		const validated = productSchema.parse(body)
		const product = await productService.createProduct(validated)
		return NextResponse.json(product, { status: 201 })
	} catch (error: any) {
		return NextResponse.json({ message: error.message }, { status: 400 })
	}
}

export async function searchProducts(req: NextRequest) {
	try {
		const url = new URL(req.url)
		const query = url.searchParams.get("q") || ""
		const results = await productService.searchProducts(query)
		return NextResponse.json(results)
	} catch (error: any) {
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}
