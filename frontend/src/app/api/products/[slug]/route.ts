import { NextRequest } from "next/server"
import { getProductBySlug, updateProduct, deleteProduct } from "backend/controllers/productController"

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ slug: string }> },
) {
	return getProductBySlug(req, (await params).slug)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) { return updateProduct(req, (await params).slug) }
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) { return deleteProduct(req, (await params).slug) }
