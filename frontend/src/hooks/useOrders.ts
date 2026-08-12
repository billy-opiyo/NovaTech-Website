"use client"

import { useState, useEffect, useCallback } from "react"
import { getMyOrders, type Order } from "@/services/orders"

interface UseOrdersOptions {
	page?: number
	limit?: number
	enabled?: boolean
}

export function useOrders({ page = 1, limit = 20, enabled = true }: UseOrdersOptions = {}) {
	const [orders, setOrders] = useState<Order[]>([])
	const [total, setTotal] = useState(0)
	const [totalPages, setTotalPages] = useState(0)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const fetchOrders = useCallback(async () => {
		if (!enabled) return
		setIsLoading(true)
		setError(null)
		try {
			const data = await getMyOrders(page, limit)
			setOrders(data.orders)
			setTotal(data.total)
			setTotalPages(data.totalPages)
		} catch (err: any) {
			setError(err.message || "Failed to load orders")
		} finally {
			setIsLoading(false)
		}
	}, [page, limit, enabled])

	useEffect(() => {
		fetchOrders()
	}, [fetchOrders])

	const refetch = useCallback(() => {
		fetchOrders()
	}, [fetchOrders])

	return {
		orders,
		total,
		totalPages,
		isLoading,
		error,
		refetch,
	}
}