import prisma from "../lib/db"

export interface ProductRecommendation {
	id: string
	name: string
	slug: string
	price: number
	discountedPrice?: number
	images: string[]
	category: string
	brand: string
	rating: number
	reviewCount: number
	stock: number
	reason?: string
}

export interface TrendingProduct extends ProductRecommendation {
	salesCount: number
	revenue: number
}

export interface SimilarProduct extends ProductRecommendation {
	similarityScore: number
}

/**
 * Get personalized product recommendations for a user based on:
 * - Recently viewed products
 * - Purchase history
 * - Wishlist items
 * - Category preferences
 */
export async function getRecommendedForUser(
	userId: string,
	tenantId: string,
	limit: number = 12
): Promise<ProductRecommendation[]> {
	const recommendations: Map<string, ProductRecommendation & { score: number; reason?: string }> =
		new Map()

	// 1. Get user's recently viewed products
	const recentlyViewed = await prisma.recentlyViewed.findMany({
		where: { userId, tenantId },
		include: {
			product: {
				include: {
					category: true,
					reviews: {
						select: {
							rating: true,
						},
					},
				},
			},
		},
		orderBy: {
			viewedAt: "desc",
		},
		take: 20,
	})

	// Score based on recently viewed (most recent = higher score)
	for (const item of recentlyViewed) {
		const product = item.product
		const existing = recommendations.get(product.id)
		if (existing) {
			existing.score += 15
		} else {
			recommendations.set(product.id, {
				...formatProduct(product),
				score: 15,
				reason: "Based on your recent views",
			})
		}
	}

	// 2. Get user's purchase history
	const orders = await prisma.order.findMany({
		where: {
			userId,
			tenantId,
			status: {
				not: "CANCELLED",
			},
		},
		include: {
			items: {
				include: {
					product: {
						include: {
							category: true,
							reviews: {
								select: {
									rating: true,
								},
							},
						},
					},
				},
			},
		},
		take: 10,
	})

	// Score based on purchased categories
	const purchasedCategories = new Map<string, number>()
	for (const order of orders) {
		for (const item of order.items) {
			const categoryName = item.product.category.name
			purchasedCategories.set(
				categoryName,
				(purchasedCategories.get(categoryName) || 0) + 1
			)

			// Also recommend similar products to purchased items
			const existing = recommendations.get(item.product.id)
			if (existing) {
				existing.score += 10
				existing.reason = "You purchased this before"
			} else {
				recommendations.set(item.product.id, {
					...formatProduct(item.product),
					score: 10,
					reason: "You purchased this before",
				})
			}
		}
	}

	// 3. Get user's wishlist
	const wishlistItems = await prisma.wishlistItem.findMany({
		where: { userId, tenantId },
		include: {
			product: {
				include: {
					category: true,
					reviews: {
						select: {
							rating: true,
						},
					},
				},
			},
		},
	})

	for (const item of wishlistItems) {
		const existing = recommendations.get(item.product.id)
		if (existing) {
			existing.score += 20
			existing.reason = "On your wishlist"
		} else {
			recommendations.set(item.product.id, {
				...formatProduct(item.product),
				score: 20,
				reason: "On your wishlist",
			})
		}
	}

	// 4. Recommend products from frequently purchased categories
	if (purchasedCategories.size > 0) {
		const topCategories = Array.from(purchasedCategories.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 3)
			.map(([name]) => name)

		const categoryProducts = await prisma.product.findMany({
			where: {
				tenantId,
				categoryId: {
					in: (await prisma.category.findMany({
						where: { tenantId, name: { in: topCategories } },
						select: { id: true },
					})).map((c) => c.id),
				},
				stock: {
					gt: 0,
				},
			},
			include: {
				category: true,
				reviews: {
					select: {
						rating: true,
					},
				},
			},
			take: 20,
			orderBy: {
				createdAt: "desc",
			},
		})

		for (const product of categoryProducts) {
			const existing = recommendations.get(product.id)
			if (existing) {
				existing.score += 8
				existing.reason = "Popular in categories you like"
			} else {
				recommendations.set(product.id, {
					...formatProduct(product),
					score: 8,
					reason: "Popular in categories you like",
				})
			}
		}
	}

	// 5. Sort by score and return top recommendations
	return Array.from(recommendations.values())
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
}

/**
 * Get trending products based on recent sales velocity
 */
export async function getTrendingProducts(tenantId: string, limit: number = 12): Promise<TrendingProduct[]> {
	const thirtyDaysAgo = new Date()
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

	// Get recent orders with items
	const recentOrders = await prisma.order.findMany({
		where: {
			tenantId,
			createdAt: {
				gte: thirtyDaysAgo,
			},
			status: {
				not: "CANCELLED",
			},
		},
		include: {
			items: {
				include: {
					product: {
						include: {
							category: true,
							reviews: {
								select: {
									rating: true,
								},
							},
						},
					},
				},
			},
		},
	})

	// Calculate sales metrics per product
	const productSales = new Map<string, { salesCount: number; revenue: number }>()

	for (const order of recentOrders) {
		for (const item of order.items) {
			const existing = productSales.get(item.productId) || { salesCount: 0, revenue: 0 }
			existing.salesCount += item.quantity
			existing.revenue += item.price * item.quantity
			productSales.set(item.productId, existing)
		}
	}

	// Sort by sales count and get top products
	const topProductIds = Array.from(productSales.entries())
		.sort((a, b) => b[1].salesCount - a[1].salesCount)
		.slice(0, limit)
		.map(([id]) => id)

	if (topProductIds.length === 0) {
		// Fallback to newest products if no recent sales
		const products = await prisma.product.findMany({
			where: {
				tenantId,
				stock: {
					gt: 0,
				},
			},
			include: {
				category: true,
				reviews: {
					select: {
						rating: true,
					},
				},
			},
			orderBy: {
				createdAt: "desc",
			},
			take: limit,
		})

		return products.map((product) => formatProduct(product) as TrendingProduct)
	}

	// Fetch full product details
	const trendingProducts = await prisma.product.findMany({
		where: {
			tenantId,
			id: {
				in: topProductIds,
			},
		},
		include: {
			category: true,
			reviews: {
				select: {
					rating: true,
				},
			},
		},
	})

	return trendingProducts
		.map((product) => {
			const sales = productSales.get(product.id) || { salesCount: 0, revenue: 0 }
			return {
				...formatProduct(product),
				salesCount: sales.salesCount,
				revenue: sales.revenue,
			}
		})
		.sort((a, b) => b.salesCount - a.salesCount)
}

/**
 * Get similar products based on category, price range, and ratings
 */
export async function getSimilarProducts(
	productId: string,
	tenantId: string,
	limit: number = 8
): Promise<SimilarProduct[]> {
	// Get the reference product
	const referenceProduct = await prisma.product.findFirst({
		where: { id: productId, tenantId },
		include: {
			category: true,
			reviews: {
				select: {
					rating: true,
				},
			},
		},
	})

	if (!referenceProduct) {
		return []
	}

	// Find similar products in the same category
	const similarProducts = await prisma.product.findMany({
		where: {
			tenantId,
			id: {
				not: productId,
			},
			categoryId: referenceProduct.categoryId,
			stock: {
				gt: 0,
			},
			// Price within 50% of reference product
			price: {
				gte: referenceProduct.price * 0.5,
				lte: referenceProduct.price * 1.5,
			},
		},
		include: {
			category: true,
			reviews: {
				select: {
					rating: true,
				},
			},
		},
		take: limit * 2, // Get extra to allow for scoring
	})

	// Calculate similarity scores
	const scored = similarProducts.map((product) => {
		let score = 50 // Base score for same category

		// Price similarity (closer to reference = higher score)
		const priceDiff = Math.abs(product.price - referenceProduct.price)
		const priceSimilarity = Math.max(0, 50 - priceDiff / referenceProduct.price * 50)
		score += priceSimilarity * 0.3

		// Rating similarity
		const referenceRating = referenceProduct.reviews.length > 0
			? referenceProduct.reviews.reduce((sum, r) => sum + r.rating, 0) / referenceProduct.reviews.length
			: 0
		const productRating = product.reviews.length > 0
			? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
			: 0
		const ratingDiff = Math.abs(referenceRating - productRating)
		score += Math.max(0, 20 - ratingDiff * 4) * 0.2

		return {
			...formatProduct(product),
			similarityScore: Math.min(100, Math.round(score)),
		}
	})

	// Sort by similarity score and return top results
	return scored
		.sort((a, b) => b.similarityScore - a.similarityScore)
		.slice(0, limit)
}

/**
 * Get featured products
 */
export async function getFeaturedProducts(tenantId: string, limit: number = 12): Promise<ProductRecommendation[]> {
	const products = await prisma.product.findMany({
		where: {
			tenantId,
			isFeatured: true,
			stock: {
				gt: 0,
			},
		},
		include: {
			category: true,
			reviews: {
				select: {
					rating: true,
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
		take: limit,
	})

	return products.map((product) => ({
		...formatProduct(product),
		reason: "Featured product",
	}))
}

/**
 * Get new arrivals
 */
export async function getNewArrivals(tenantId: string, limit: number = 12): Promise<ProductRecommendation[]> {
	const products = await prisma.product.findMany({
		where: {
			tenantId,
			isNewArrival: true,
			stock: {
				gt: 0,
			},
		},
		include: {
			category: true,
			reviews: {
				select: {
					rating: true,
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
		take: limit,
	})

	return products.map((product) => ({
		...formatProduct(product),
		reason: "New arrival",
	}))
}

/**
 * Get deals and on-sale products
 */
export async function getDeals(tenantId: string, limit: number = 12): Promise<ProductRecommendation[]> {
	const products = await prisma.product.findMany({
		where: {
			tenantId,
			discountedPrice: {
				not: null,
			},
			stock: {
				gt: 0,
			},
		},
		include: {
			category: true,
			reviews: {
				select: {
					rating: true,
				},
			},
		},
		orderBy: {
			discountedPrice: "asc",
		},
		take: limit,
	})

	return products.map((product) => ({
		...formatProduct(product),
		reason: "On sale",
	}))
}

/**
 * Helper function to format product data
 */
function formatProduct(product: {
	id: string
	name: string
	slug: string
	price: number
	discountedPrice: number | null
	images: string[]
	category: {
		name: string
	}
	reviews: {
		rating: number
	}[]
	stock: number
	brand?: string
	rating?: number
}): ProductRecommendation {
	const reviewCount = product.reviews.length
	const rating =
		reviewCount > 0
			? product.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
			: product.rating || 0

	return {
		id: product.id,
		name: product.name,
		slug: product.slug,
		price: product.price,
		discountedPrice: product.discountedPrice || undefined,
		images: product.images,
		category: product.category.name,
		brand: product.brand || "Unknown",
		rating: Math.round(rating * 10) / 10,
		reviewCount,
		stock: product.stock,
	}
}
