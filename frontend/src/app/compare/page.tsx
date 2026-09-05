"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Minus, Plus, Search, Star, X } from "lucide-react"
import { getProductImage } from "@/constants/productImages"
import { useStoreContext } from "@/lib/store-context"
import { getStoreRouteHref } from "@/lib/store-home"

type CompareProduct = {
	id: string
	name: string
	slug: string
	brand: string
	images: string[]
	price: number
	discountedPrice?: number | null
	averageRating: number
	specs: Record<string, unknown>
}

const allSpecs = ["Processor", "RAM", "Storage", "Display", "Battery", "Camera", "OS", "Weight", "GPU", "Ports"]

export default function ComparePage() {
	const store = useStoreContext()
	const [compareItems, setCompareItems] = useState<CompareProduct[]>([])
	const [searchOpen, setSearchOpen] = useState(false)
	const [searchQuery, setSearchQuery] = useState("")
	const [results, setResults] = useState<CompareProduct[]>([])
	const [loading, setLoading] = useState(false)
	const [hydrated, setHydrated] = useState(false)

	useEffect(() => {
		try {
			const saved = localStorage.getItem("novatech-compare")
			if (saved) setCompareItems(JSON.parse(saved))
		} catch { /* Ignore invalid client storage and start empty. */ }
		setHydrated(true)
	}, [])

	useEffect(() => {
		if (hydrated) localStorage.setItem("novatech-compare", JSON.stringify(compareItems))
	}, [compareItems, hydrated])

	useEffect(() => {
		if (!searchOpen || searchQuery.trim().length < 2) {
			setResults([])
			return
		}
		const controller = new AbortController()
		setLoading(true)
		fetch(getStoreRouteHref(store, `/api/products?q=${encodeURIComponent(searchQuery)}&limit=8`), { signal: controller.signal, cache: "no-store" })
			.then((response) => response.ok ? response.json() : Promise.reject(new Error("Search failed")))
			.then((data) => setResults(data.products || []))
			.catch((error) => { if (error.name !== "AbortError") setResults([]) })
			.finally(() => setLoading(false))
		return () => controller.abort()
	}, [searchOpen, searchQuery, store])

	const addToCompare = (product: CompareProduct) => {
		if (compareItems.length < 4 && !compareItems.some((item) => item.id === product.id)) {
			setCompareItems((items) => [...items, product])
		}
		setSearchOpen(false)
		setSearchQuery("")
	}

	const removeFromCompare = (id: string) => setCompareItems((items) => items.filter((item) => item.id !== id))

	return (
		<div>
			<div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center">
				<Link href={getStoreRouteHref(store, "/products")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary"><ArrowLeft size={18} /> Back to Products</Link>
				<span className="hidden text-gray-400 sm:inline">|</span>
				<h1 className="text-xl font-bold sm:text-2xl">Compare Products</h1>
			</div>

			<div className="mb-6 flex items-center justify-between gap-3">
				<p className="text-sm text-gray-500">{compareItems.length}/4 products selected</p>
				<button onClick={() => setSearchOpen(true)} disabled={compareItems.length >= 4} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"><Plus size={18} /> Add Product</button>
			</div>

			{compareItems.length === 0 ? (
				<div className="glass-card py-20 text-center"><p className="text-gray-500">Select products from the live catalog to compare specifications.</p></div>
			) : (
				<div className="glass-card overflow-x-auto p-4"><table className="w-full min-w-[720px] border-collapse text-sm"><thead><tr><th className="w-40 p-3 text-left text-gray-500">Product</th>{compareItems.map((product) => <th key={product.id} className="relative p-3 text-center align-top"><button onClick={() => removeFromCompare(product.id)} className="absolute right-1 top-1 text-red-500" aria-label={`Remove ${product.name}`}><X size={16} /></button><div className="relative mx-auto mb-2 h-24 w-24 overflow-hidden rounded-lg bg-gray-100"><Image src={getProductImage(product.images?.[0], product.name)} alt={product.name} fill className="object-cover" /></div><p className="text-xs text-gray-500">{product.brand}</p><Link href={getStoreRouteHref(store, `/products/${product.slug}`)} className="font-semibold hover:text-primary">{product.name}</Link><div className="mt-1 flex items-center justify-center gap-1"><Star size={13} className="fill-yellow-500 text-yellow-500" /> {product.averageRating?.toFixed(1) || "—"}</div><p className="mt-1 font-bold text-primary">KES {(product.discountedPrice ?? product.price).toLocaleString()}</p></th>)}</tr></thead><tbody>{allSpecs.map((spec) => <tr key={spec} className="border-t"><th className="bg-black/5 p-3 text-left font-medium">{spec}</th>{compareItems.map((product) => <td key={`${product.id}-${spec}`} className="p-3 text-center">{formatSpec(product.specs?.[spec]) || <Minus size={14} className="mx-auto text-gray-300" />}</td>)}</tr>)}</tbody></table></div>
			)}

			{searchOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSearchOpen(false)}><div className="glass-card w-full max-w-lg p-6" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Add product</h2><button onClick={() => setSearchOpen(false)}><X size={20} /></button></div><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search the catalog" className="w-full rounded-lg border bg-transparent py-3 pl-10 pr-3" /></div><div className="mt-4 max-h-80 space-y-2 overflow-y-auto">{loading && <p className="p-4 text-sm text-gray-500">Searching…</p>}{results.filter((product) => !compareItems.some((item) => item.id === product.id)).map((product) => <button key={product.id} onClick={() => addToCompare(product)} className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-black/5"><div className="relative h-12 w-12 overflow-hidden rounded-lg bg-gray-100"><Image src={getProductImage(product.images?.[0], product.name)} alt="" fill className="object-cover" /></div><span className="flex-1"><span className="block font-medium">{product.name}</span><span className="text-xs text-gray-500">{product.brand}</span></span><Plus size={18} className="text-primary" /></button>)}{!loading && searchQuery.length >= 2 && !results.length && <p className="p-4 text-sm text-gray-500">No catalog products found.</p>}</div></div></div>}
		</div>
	)
}

function formatSpec(value: unknown) {
	if (value === null || value === undefined || value === "") return ""
	return typeof value === "string" ? value : JSON.stringify(value)
}
