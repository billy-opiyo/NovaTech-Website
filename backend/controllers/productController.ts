import { NextRequest, NextResponse } from "next/server"
import * as productService from "../services/productService"

export async function getProducts(req: NextRequest) {
	const url = new URL(req.url)
	const searchParams = url.searchParams
	const products = await productService.getFilteredProducts(searchParams)
	return NextResponse.json(products)
}
