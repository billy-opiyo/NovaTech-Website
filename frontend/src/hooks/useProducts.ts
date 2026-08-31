"use client"

import { useState, useEffect, useCallback } from "react"
import { getProducts, type Product, type ProductQuery } from "@/services/products"

interface UseProductsOptions {
	initialQuery?: ProductQuery
	enabled?: boolean
}

export function useProducts({ initialQuery = {}, enabled = true }: UseProductsOptions = {}) {
	const [products, setProducts] = useState<Product[]>([])
	const [total, setTotal] = useState(0)
	const [totalPages, setTotalPages] = useState(0)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [query, setQuery] = useState<ProductQuery>(initialQuery)

	const fetchProducts = useCallback(async () => {
		if (!enabled) return
		setIsLoading(true)
		setError(null)
		try {
			const data = await getProducts(query)
			setProducts(data.products)
			setTotal(data.total)
			setTotalPages(data.totalPages)
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Failed to load products")
		} finally {
			setIsLoading(false)
		}
	}, [query, enabled])

	useEffect(() => {
		fetchProducts()
	}, [fetchProducts])

	const refetch = useCallback(() => {
		fetchProducts()
	}, [fetchProducts])

	return {
		products,
		total,
		totalPages,
		isLoading,
		error,
		query,
		setQuery,
		refetch,
	}
}
