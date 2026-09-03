"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, Search, XCircle, type LucideIcon } from "lucide-react"
import { useToast } from "@/components/ui/Toast"

type InventoryItem = { id: string; variantId?: string; name: string; sku: string; category: string; currentStock: number; threshold: number; price: number; image: string; variant?: string }
type Overview = { totalProducts: number; inStockProducts: number; lowStockProducts: number; outOfStockProducts: number; totalInventoryValue: number }

export default function AdminInventoryPage() {
	const { addToast } = useToast()
	const [overview, setOverview] = useState<Overview | null>(null)
	const [items, setItems] = useState<InventoryItem[]>([])
	const [query, setQuery] = useState("")
	const [error, setError] = useState("")
	async function load() {
		const [summary, low, out] = await Promise.all([fetch("/api/inventory?action=overview"), fetch("/api/inventory?action=low-stock&threshold=10"), fetch("/api/inventory?action=out-of-stock")])
		if (!summary.ok || !low.ok || !out.ok) throw new Error("Unable to load inventory")
		setOverview(await summary.json()); setItems([...(await low.json()), ...(await out.json())])
	}
	useEffect(() => { load().catch((reason) => setError(reason.message)) }, [])
	const filtered = useMemo(() => items.filter((item) => `${item.name} ${item.sku} ${item.category}`.toLowerCase().includes(query.toLowerCase())), [items, query])
	async function update(item: InventoryItem) { const value = Number(window.prompt(`New stock for ${item.name}`, String(item.currentStock))); if (!Number.isInteger(value) || value < 0) return; try { const response = await fetch("/api/inventory", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item.variantId ? { variantId: item.variantId, newStock: value } : { productId: item.id, newStock: value }) }); if (!response.ok) { setError("Unable to update stock"); addToast("Unable to update stock", "error"); return }; await load(); addToast("Stock updated successfully", "success") } catch { setError("Unable to update stock"); addToast("Unable to update stock", "error") } }
	if (error && !overview) return <div className="py-20 text-center text-red-500">{error}</div>
	const stats: { label: string; value?: number; icon: LucideIcon }[] = [["Products", overview?.totalProducts, CheckCircle2], ["In stock", overview?.inStockProducts, CheckCircle2], ["Low stock", overview?.lowStockProducts, AlertTriangle], ["Out of stock", overview?.outOfStockProducts, XCircle]].map(([label, value, icon]) => ({ label: label as string, value: value as number | undefined, icon: icon as LucideIcon }))
	return <div className="space-y-6"><div><h1 className="text-3xl font-bold">Inventory</h1><p className="mt-1 text-gray-500">Live stock levels from the product database.</p></div>{error && <p className="text-sm text-red-500">{error}</p>}<div className="grid gap-4 sm:grid-cols-4">{stats.map(({ label, value, icon: Icon }) => <div key={label} className="glass-card p-4"><Icon className="mb-2 text-primary" size={22}/><p className="text-2xl font-bold">{value ?? "—"}</p><p className="text-sm text-gray-500">{label}</p></div>)}</div><div className="glass-card flex items-center gap-3 p-4"><Search className="text-gray-400" size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product, SKU, or category" className="w-full bg-transparent outline-none"/></div><div className="glass-card overflow-x-auto"><table className="w-full min-w-[720px]"><thead><tr className="border-b text-left text-sm text-gray-500"><th className="p-4">Product</th><th className="p-4">SKU</th><th className="p-4">Category</th><th className="p-4">Stock</th><th className="p-4">Value</th><th className="p-4"/></tr></thead><tbody>{filtered.map((item) => <tr key={`${item.id}-${item.variant || "base"}`} className="border-b last:border-0"><td className="p-4 font-medium">{item.name}{item.variant && <span className="ml-2 text-xs text-gray-500">({item.variant})</span>}</td><td className="p-4 font-mono text-xs">{item.sku}</td><td className="p-4 text-sm">{item.category}</td><td className={`p-4 font-semibold ${item.currentStock ? "text-orange-500" : "text-red-500"}`}>{item.currentStock}</td><td className="p-4">KES {(item.price * item.currentStock).toLocaleString()}</td><td className="p-4"><button onClick={() => update(item)} className="rounded-lg border px-3 py-1 text-sm hover:border-primary">Update stock</button></td></tr>)}</tbody></table>{!filtered.length && <p className="p-10 text-center text-gray-500">No low or out-of-stock products.</p>}</div></div>
}
