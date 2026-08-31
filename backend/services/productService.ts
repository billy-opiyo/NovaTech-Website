import prisma from "../lib/db"
import { Prisma } from "@prisma/client"
import { assertTenantProductLimit } from "../billing/subscription"

export async function getFilteredProducts(params: URLSearchParams, tenantId: string) {
	const where: Prisma.ProductWhereInput = { tenantId }

	const categorySlug = params.get("category")
	if (categorySlug) {
		where.category = { slug: categorySlug }
	}

	const brands = params.get("brands")?.split(",")
	if (brands?.length) {
		where.brand = { in: brands }
	}

	const minPrice = params.get("minPrice")
	const maxPrice = params.get("maxPrice")
	if (minPrice || maxPrice) {
		const parsedMin = minPrice ? Number(minPrice) : undefined
		const parsedMax = maxPrice ? Number(maxPrice) : undefined
		where.price = {
			...(parsedMin !== undefined && Number.isFinite(parsedMin) && parsedMin >= 0 ? { gte: parsedMin } : {}),
			...(parsedMax !== undefined && Number.isFinite(parsedMax) && parsedMax >= 0 ? { lte: parsedMax } : {}),
		}
	}

	const search = params.get("q") || params.get("search")
	const andFilters: Prisma.ProductWhereInput[] = []
	if (search) {
		andFilters.push({ OR: [
			{ name: { contains: search, mode: "insensitive" } },
			{ brand: { contains: search, mode: "insensitive" } },
			{ description: { contains: search, mode: "insensitive" } },
			{ sku: { contains: search, mode: "insensitive" } },
		] })
	}

	if (params.get("inStock") === "true") {
		andFilters.push({
			OR: [
				{ stock: { gt: 0 } },
				{ variants: { some: { tenantId, stock: { gt: 0 } } } },
			],
		})
	}
	if (andFilters.length) where.AND = andFilters

	if (params.get("onSale") === "true") {
		where.discountedPrice = { not: null }
	}

	if (params.get("featured") === "true") {
		where.isFeatured = true
	}

	if (params.get("newArrivals") === "true") {
		where.isNewArrival = true
	}

	let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" }
	const sortBy = params.get("sortBy")
	switch (sortBy) {
		case "price-asc":
			orderBy = { price: "asc" }
			break
		case "price-desc":
			orderBy = { price: "desc" }
			break
		case "rating":
			// Fetch the most-reviewed products first; the client then sorts by
			// calculated average rating for the visible result set.
			orderBy = { reviews: { _count: "desc" } }
			break
		case "name":
			orderBy = { name: "asc" }
			break
		case "newest":
		default:
			orderBy = { createdAt: "desc" }
	}

	const page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1)
	const limit = Math.min(100, Math.max(1, Number.parseInt(params.get("limit") || "20", 10) || 20))
	const skip = (page - 1) * limit

	const [products, total] = await Promise.all([
		prisma.product.findMany({
			where,
			include: {
				category: true,
				variants: { where: { tenantId } },
				reviews: {
					where: { moderationStatus: "APPROVED" },
					select: {
						rating: true,
					},
				},
				_count: {
					select: {
						reviews: { where: { moderationStatus: "APPROVED" } },
					},
				},
			},
			orderBy,
			skip,
			take: limit,
		}),
		prisma.product.count({ where }),
	])

	return {
		products: products.map((product) => ({
			...product,
			averageRating:
				product.reviews.length > 0
					? product.reviews.reduce((sum, r) => sum + r.rating, 0) /
						product.reviews.length
					: 0,
			reviewCount: product._count.reviews,
		})),
		total,
		page,
		totalPages: Math.ceil(total / limit),
	}
}

export async function getProductBySlug(slug: string, tenantId: string) {
	const product = await prisma.product.findFirst({
		where: { slug, tenantId },
		include: {
			category: true,
			variants: { where: { tenantId } },
			reviews: {
				where: { moderationStatus: "APPROVED" },
				include: {
					user: {
						select: {
							name: true,
							image: true,
						},
					},
				},
				orderBy: { createdAt: "desc" },
				take: 10,
			},
			_count: {
				select: {
					reviews: { where: { moderationStatus: "APPROVED" } },
				},
			},
		},
	})

	if (!product) return null

	const averageRating =
		product.reviews.length > 0
			? product.reviews.reduce((sum, r) => sum + r.rating, 0) /
				product.reviews.length
			: 0

	return {
		...product,
		averageRating,
		reviewCount: product._count.reviews,
	}
}

export async function searchProducts(query: string, tenantId: string) {
	if (!query || query.length < 2) return []

	const products = await prisma.product.findMany({
		where: {
			tenantId,
			OR: [
				{ name: { contains: query, mode: "insensitive" } },
				{ brand: { contains: query, mode: "insensitive" } },
				{ sku: { contains: query, mode: "insensitive" } },
				{ description: { contains: query, mode: "insensitive" } },
			],
		},
		select: {
			id: true,
			name: true,
			slug: true,
			price: true,
			discountedPrice: true,
			images: true,
			brand: true,
			category: { select: { name: true, slug: true } },
		},
		take: 8,
	})

	return products
}

export async function createProduct(data: any, tenantId: string) {
	await assertTenantProductLimit(tenantId)
	const category = await prisma.category.findFirst({ where: { id: data.categoryId, tenantId }, select: { id: true } })
	if (!category) throw new Error("Category not found")
	return prisma.product.create({
		data: {
			tenantId,
			name: data.name,
			slug: data.slug,
			description: data.description,
			brand: data.brand,
			sku: data.sku,
			price: data.price,
			discountedPrice: data.discountedPrice,
			stock: data.stock,
			warranty: data.warranty,
			specs: data.specs,
			images: data.images,
			categoryId: data.categoryId,
			isFeatured: data.isFeatured || false,
			isNewArrival: data.isNewArrival || false,
			variants: data.variants
				? {
						create: data.variants.map((v: any) => ({
							tenantId,
							name: v.name,
							value: v.value,
							priceModifier: v.priceModifier,
							stock: v.stock,
							sku: v.sku,
						})),
					}
				: undefined,
		},
		include: {
			category: true,
			variants: true,
		},
	})
}

export async function updateProduct(slug: string, data: any, tenantId: string) {
	const allowed = ["name", "description", "brand", "price", "discountedPrice", "stock", "warranty", "specs", "images", "isFeatured", "isNewArrival"]
	const update = Object.fromEntries(Object.entries(data).filter(([key, value]) => allowed.includes(key) && value !== undefined))
	if (update.price !== undefined) update.price = Number(update.price)
	if (update.discountedPrice !== undefined && update.discountedPrice !== null) update.discountedPrice = Number(update.discountedPrice)
	if (update.stock !== undefined) update.stock = Number(update.stock)
	const product = await prisma.product.findFirst({ where: { slug, tenantId }, select: { id: true, price: true } })
	if (!product) throw new Error("Product not found")
	const nextPrice = update.price === undefined ? product.price : Number(update.price)
	if (update.discountedPrice !== undefined && update.discountedPrice !== null && Number(update.discountedPrice) > nextPrice) {
		throw new Error("discountedPrice cannot exceed price")
	}
	return prisma.product.update({ where: { id: product.id }, data: update, include: { category: true, variants: { where: { tenantId } } } })
}

export async function deleteProduct(slug: string, tenantId: string) {
	const product = await prisma.product.findFirst({ where: { slug, tenantId }, select: { id: true, orderItems: { select: { id: true }, take: 1 } } })
	if (!product) throw new Error("Product not found")
	if (product.orderItems.length) throw new Error("Products with order history cannot be deleted; set stock to zero instead")
	return prisma.product.delete({ where: { id: product.id } })
}
