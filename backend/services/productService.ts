import prisma from "../lib/db"

export async function getFilteredProducts(params: URLSearchParams) {
	const where: any = {}
	const categorySlug = params.get("category")
	if (categorySlug) where.category = { slug: categorySlug }

	const products = await prisma.product.findMany({
		where,
		include: { category: true, variants: true },
		take: 20,
		orderBy: { createdAt: "desc" },
	})
	return products
}
