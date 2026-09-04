import { apiFetch, buildQueryString } from "./api"

export interface Product {
	id: string
	name: string
	slug: string
	description: string
	brand: string
	sku: string
	price: number
	discountedPrice?: number | null
	stock: number
	images: string[]
	categoryId: string
	category?: { name: string; slug: string }
	variants?: {
		id: string
		name: string
		value: string
		priceModifier?: number | null
		stock: number
	}[]
	rating?: number
	reviewCount?: number
	isFeatured?: boolean
	isNewArrival?: boolean
	isTrending?: boolean
}

export interface ProductQuery {
	[key: string]: string | number | boolean | undefined
	page?: number
	limit?: number
	category?: string
	search?: string
	sort?: string
	minPrice?: number
	maxPrice?: number
	brand?: string
	trending?: boolean
}

export interface ProductListResponse {
	products: Product[]
	total: number
	page: number
	totalPages: number
}

export async function getProducts(query: ProductQuery = {}): Promise<ProductListResponse> {
	const qs = buildQueryString(query)
	return apiFetch<ProductListResponse>(`/api/products${qs}`)
}

export async function getProductBySlug(slug: string): Promise<Product> {
	return apiFetch<Product>(`/api/products/${slug}`)
}

export async function searchProducts(q: string): Promise<Product[]> {
	return apiFetch<Product[]>(`/api/products?q=${encodeURIComponent(q)}`)
}
