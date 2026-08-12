"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"

type Product = { id: string; name: string; slug: string; brand: string; price: number; discountedPrice?: number | null; stock: number; images: string[]; category?: { name: string }; reviewCount?: number }

export default function AdminProductsPage() {
	const [products, setProducts] = useState<Product[]>([]); const [query, setQuery] = useState(""); const [error, setError] = useState("")
	useEffect(() => { fetch("/api/products?limit=100").then(async (response) => { if (!response.ok) throw new Error("Unable to load products"); return response.json() }).then((data) => setProducts(data.products)).catch((reason) => setError(reason.message)) }, [])
	const filtered = useMemo(() => products.filter((product) => `${product.name} ${product.brand} ${product.category?.name || ""}`.toLowerCase().includes(query.toLowerCase())), [products, query])
	if (error) return <div className="py-20 text-center text-red-500">{error}</div>
	return <div className="space-y-6"><div><h1 className="text-3xl font-bold">Products</h1><p className="mt-1 text-gray-500">Live catalog inventory.</p></div><div className="glass-card flex items-center gap-3 p-4"><Search className="text-gray-400" size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" className="w-full bg-transparent outline-none"/></div><div className="glass-card overflow-x-auto"><table className="w-full min-w-[720px]"><thead><tr className="border-b text-left text-sm text-gray-500"><th className="p-4">Product</th><th className="p-4">Category</th><th className="p-4">Price</th><th className="p-4">Stock</th><th className="p-4">Reviews</th><th className="p-4"/></tr></thead><tbody>{filtered.map((product) => <tr key={product.id} className="border-b last:border-0"><td className="p-4"><p className="font-medium">{product.name}</p><p className="text-xs text-gray-500">{product.brand} · {product.slug}</p></td><td className="p-4 text-sm">{product.category?.name || "—"}</td><td className="p-4">KES {(product.discountedPrice ?? product.price).toLocaleString()}</td><td className={`p-4 font-semibold ${product.stock ? "text-green-600" : "text-red-500"}`}>{product.stock}</td><td className="p-4">{product.reviewCount ?? 0}</td><td className="p-4"><Link href={`/products/${product.slug}`} className="text-sm text-primary">View</Link></td></tr>)}</tbody></table>{!filtered.length && <p className="p-10 text-center text-gray-500">No products found.</p>}</div></div>
}
