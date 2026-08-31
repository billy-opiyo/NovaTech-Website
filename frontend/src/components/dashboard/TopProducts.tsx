"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { getProductImage } from "@/constants/productImages"

interface TopProduct {
	id: string
	slug: string
	name: string
	sales: number
	revenue: number
	image: string
}

export default function TopProducts() {
	const [products, setProducts] = useState<TopProduct[]>([])
	const [state, setState] = useState<"loading" | "ready" | "error">("loading")
	const pathname = usePathname()
	const basePath = pathname.startsWith("/manage") ? "/manage" : "/admin"

	useEffect(() => {
		fetch("/api/analytics?timeRange=30d")
			.then(async (response) => {
				if (!response.ok) throw new Error("Unable to load top products")
				return response.json()
			})
			.then((data) => { setProducts(data.topProducts ?? []); setState("ready") })
			.catch(() => setState("error"))
	}, [])

	return (
		<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="glass-card p-6">
			<div className="mb-6"><h2 className="text-xl font-bold">Top Products</h2><p className="mt-1 text-sm text-gray-500">Best sellers in the last 30 days</p></div>
			{state === "loading" && <p className="py-8 text-center text-sm text-gray-500">Loading products…</p>}
			{state === "error" && <p className="py-8 text-center text-sm text-red-500">Unable to load top products.</p>}
			{state === "ready" && !products.length && <p className="py-8 text-center text-sm text-gray-500">No product sales recorded yet.</p>}
			{state === "ready" && products.length > 0 && <div className="space-y-4">{products.map((product) => <div key={product.id} className="flex items-center gap-4"><div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700"><Image src={getProductImage(product.image, product.name)} alt={product.name} fill className="object-cover" /></div><div className="min-w-0 flex-1"><Link href={`/products/${product.slug}`} className="block truncate text-sm font-medium hover:text-primary">{product.name}</Link><p className="mt-1 text-xs text-gray-500">{product.sales} sold</p><p className="mt-1 text-sm font-semibold text-green-600">KES {product.revenue.toLocaleString()}</p></div></div>)}</div>}
			<Link href={`${basePath}/products`} className="mt-4 block w-full rounded-lg border border-gray-300 px-4 py-2 text-center text-sm transition hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700">View All Products</Link>
		</motion.div>
	)
}
