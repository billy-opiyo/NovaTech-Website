"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ImagePlus, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react"
import { useStoreContext } from "@/lib/store-context"

type Category = { id: string; name: string; slug: string }
type Product = {
	id: string
	name: string
	slug: string
	description: string
	brand: string
	sku: string
	price: number
	discountedPrice?: number | null
	stock: number
	warranty?: string | null
	specs?: Record<string, string> | null
	images: string[]
	categoryId: string
	category?: { name: string }
	isFeatured: boolean
	isNewArrival: boolean
	reviewCount?: number
}

type Draft = {
	name: string; description: string; brand: string; sku: string; price: string
	discountedPrice: string; stock: string; warranty: string; categoryId: string
	images: string; specs: string; isFeatured: boolean; isNewArrival: boolean
}

const emptyDraft: Draft = {
	name: "", description: "", brand: "", sku: "", price: "", discountedPrice: "",
	stock: "0", warranty: "", categoryId: "", images: "", specs: "",
	isFeatured: false, isNewArrival: false,
}

function draftFromProduct(product: Product): Draft {
	return {
		name: product.name, description: product.description, brand: product.brand, sku: product.sku,
		price: String(product.price), discountedPrice: product.discountedPrice == null ? "" : String(product.discountedPrice),
		stock: String(product.stock), warranty: product.warranty || "", categoryId: product.categoryId,
		images: product.images.join("\n"), specs: Object.entries(product.specs || {}).map(([key, value]) => `${key}=${value}`).join("\n"),
		isFeatured: product.isFeatured, isNewArrival: product.isNewArrival,
	}
}

function slugify(value: string) {
	return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 180)
}

function parseLines(value: string) {
	return value.split("\n").map((line) => line.trim()).filter(Boolean)
}

function parseSpecs(value: string) {
	const specs: Record<string, string> = {}
	for (const line of parseLines(value)) {
		const separator = line.indexOf("=")
		if (separator < 1 || !line.slice(separator + 1).trim()) throw new Error("Specs must use one key=value pair per line")
		specs[line.slice(0, separator).trim()] = line.slice(separator + 1).trim()
	}
	return specs
}

export default function ManageProductsPage() {
	const { storeSlug } = useStoreContext()
	const [products, setProducts] = useState<Product[]>([])
	const [categories, setCategories] = useState<Category[]>([])
	const [query, setQuery] = useState("")
	const [error, setError] = useState("")
	const [notice, setNotice] = useState("")
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [uploading, setUploading] = useState(false)
	const [editorOpen, setEditorOpen] = useState(false)
	const [editing, setEditing] = useState<Product | null>(null)
	const [draft, setDraft] = useState<Draft>(emptyDraft)

	const load = async () => {
		setLoading(true); setError("")
		try {
			const [productsResponse, categoriesResponse] = await Promise.all([
				fetch("/api/products?limit=100", { cache: "no-store" }),
				fetch("/api/manage/catalog/categories", { cache: "no-store" }),
			])
			const productsBody = await productsResponse.json()
			const categoriesBody = await categoriesResponse.json()
			if (!productsResponse.ok) throw new Error(productsBody.message || "Products unavailable")
			if (!categoriesResponse.ok) throw new Error(categoriesBody.message || "Product categories unavailable")
			setProducts(productsBody.products || [])
			setCategories(categoriesBody.categories || [])
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "Unable to load catalog")
		} finally { setLoading(false) }
	}

	useEffect(() => { void load() }, [])

	const filtered = useMemo(() => products.filter((product) => `${product.name} ${product.brand} ${product.sku} ${product.category?.name || ""}`.toLowerCase().includes(query.toLowerCase())), [products, query])
	const updateDraft = (field: keyof Draft, value: string | boolean) => setDraft((current) => ({ ...current, [field]: value }))

	const startCreate = () => { setEditing(null); setDraft({ ...emptyDraft, categoryId: categories[0]?.id || "" }); setError(""); setNotice(""); setEditorOpen(true) }
	const startEdit = (product: Product) => { setEditing(product); setDraft(draftFromProduct(product)); setError(""); setNotice(""); setEditorOpen(true) }
	const closeEditor = () => { if (!saving && !uploading) setEditorOpen(false) }

	const save = async (event: FormEvent) => {
		event.preventDefault(); setSaving(true); setError(""); setNotice("")
		try {
			const images = parseLines(draft.images)
			const specs = parseSpecs(draft.specs)
			if (!draft.categoryId) throw new Error("Choose a product category")
			if (!images.length) throw new Error("Add at least one gallery image URL or upload an image")
			const payload = {
				name: draft.name.trim(), description: draft.description.trim(), brand: draft.brand.trim(), price: Number(draft.price),
				discountedPrice: draft.discountedPrice.trim() ? Number(draft.discountedPrice) : undefined, stock: Number(draft.stock),
				warranty: draft.warranty.trim() || undefined, categoryId: draft.categoryId, images, specs: Object.keys(specs).length ? specs : undefined,
				isFeatured: draft.isFeatured, isNewArrival: draft.isNewArrival,
				...(editing ? {} : { sku: draft.sku.trim(), slug: slugify(draft.name) }),
			}
			const response = await fetch(editing ? `/api/products/${editing.slug}` : "/api/products", {
				method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
			})
			const body = await response.json()
			if (!response.ok) throw new Error(body.message || "Unable to save product")
			await load()
			if (!editing) { setEditing(body); setDraft(draftFromProduct(body)); }
			setNotice(editing ? "Product updated" : "Product created. You can now upload its gallery images.")
		} catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save product")
		} finally { setSaving(false) }
	}

	const uploadGallery = async (files: FileList | null) => {
		if (!files || !editing) return
		setUploading(true); setError(""); setNotice("")
		try {
			const urls = parseLines(draft.images)
			for (const file of Array.from(files)) {
				const formData = new FormData(); formData.append("file", file); formData.append("productId", editing.id)
				const response = await fetch("/api/products/upload", { method: "POST", body: formData }); const body = await response.json()
				if (!response.ok) throw new Error(body.message || `Unable to upload ${file.name}`)
				urls.push(body.url)
			}
			updateDraft("images", urls.join("\n")); setNotice("Gallery upload complete. Save the product to publish the new images.")
		} catch (reason) { setError(reason instanceof Error ? reason.message : "Gallery upload failed")
		} finally { setUploading(false) }
	}

	const remove = async (product: Product) => {
		if (!window.confirm(`Delete ${product.name}? Products with order history cannot be deleted.`)) return
		setError(""); setNotice("")
		const response = await fetch(`/api/products/${product.slug}`, { method: "DELETE" }); const body = await response.json()
		if (!response.ok) setError(body.message || "Unable to delete product")
		else { setProducts((items) => items.filter((item) => item.id !== product.id)); setNotice("Product deleted") }
	}

	return <div className="space-y-6">
		<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="text-3xl font-bold">Products</h1><p className="mt-1 text-gray-500">Manage your electronics catalog, pricing, specifications, and galleries.</p></div><button onClick={startCreate} className="btn-primary inline-flex items-center justify-center gap-2"><Plus size={18} /> Add product</button></div>
		{error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</p>}{notice && <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
		<div className="glass-card flex items-center gap-3 p-4"><Search className="text-gray-400" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, brand, SKU, or category" className="w-full bg-transparent outline-none" /></div>
		{editorOpen && <form onSubmit={save} className="glass-card space-y-5 p-5"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">{editing ? "Edit product" : "Add product"}</h2><p className="text-sm text-gray-500">Fields are saved to this store only.</p></div><button type="button" onClick={closeEditor} aria-label="Close editor"><X /></button></div>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2"><label className="text-sm">Name *<input required minLength={3} value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-dark-surface" /></label><label className="text-sm">Brand *<input required value={draft.brand} onChange={(event) => updateDraft("brand", event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-dark-surface" /></label><label className="text-sm">SKU *{editing ? <span className="ml-1 text-xs text-gray-500">(cannot change)</span> : null}<input required disabled={Boolean(editing)} value={draft.sku} onChange={(event) => updateDraft("sku", event.target.value)} className="mt-1 w-full rounded-lg border p-2 disabled:opacity-60 dark:bg-dark-surface" /></label><label className="text-sm">Category *<select required value={draft.categoryId} onChange={(event) => updateDraft("categoryId", event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-dark-surface"><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="text-sm">Price (KES) *<input required min="0.01" step="0.01" type="number" value={draft.price} onChange={(event) => updateDraft("price", event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-dark-surface" /></label><label className="text-sm">Sale price (KES)<input min="0.01" step="0.01" type="number" value={draft.discountedPrice} onChange={(event) => updateDraft("discountedPrice", event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-dark-surface" /></label><label className="text-sm">Stock *<input required min="0" step="1" type="number" value={draft.stock} onChange={(event) => updateDraft("stock", event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-dark-surface" /></label><label className="text-sm">Warranty<input value={draft.warranty} onChange={(event) => updateDraft("warranty", event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-dark-surface" /></label></div>
			<label className="block text-sm">Description *<textarea required minLength={10} rows={3} value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-dark-surface" /></label>
			<label className="block text-sm">Gallery image URLs *<textarea required rows={3} value={draft.images} onChange={(event) => updateDraft("images", event.target.value)} placeholder="One URL or app-relative path per line" className="mt-1 w-full rounded-lg border p-2 dark:bg-dark-surface" /></label>
			{editing && <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm"><ImagePlus size={17} /> {uploading ? "Uploading…" : "Upload gallery images"}<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading} onChange={(event) => { void uploadGallery(event.target.files); event.target.value = "" }} className="hidden" /></label>}
			<label className="block text-sm">Specifications *<textarea rows={4} value={draft.specs} onChange={(event) => updateDraft("specs", event.target.value)} placeholder="Example:&#10;Storage=256GB&#10;Color=Black" className="mt-1 w-full rounded-lg border p-2 font-mono dark:bg-dark-surface" /></label>
			<div className="flex flex-wrap gap-5 text-sm"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={draft.isFeatured} onChange={(event) => updateDraft("isFeatured", event.target.checked)} /> Featured</label><label className="inline-flex items-center gap-2"><input type="checkbox" checked={draft.isNewArrival} onChange={(event) => updateDraft("isNewArrival", event.target.checked)} /> New arrival</label></div>
			{!categories.length && <p className="text-sm text-amber-600">No categories are available for this store. Add tenant categories before creating a product.</p>}<div className="flex justify-end gap-3"><button type="button" onClick={closeEditor} className="rounded-lg border px-4 py-2">Cancel</button><button disabled={saving || uploading || !categories.length} className="btn-primary inline-flex items-center gap-2">{saving && <Loader2 size={17} className="animate-spin" />} {saving ? "Saving…" : "Save product"}</button></div>
		</form>}
		<div className="glass-card overflow-x-auto">{loading ? <p className="p-10 text-center text-gray-500">Loading catalog…</p> : <table className="w-full min-w-[980px]"><thead><tr className="border-b text-left text-sm text-gray-500"><th className="p-4">Product</th><th className="p-4">Category</th><th className="p-4">Price</th><th className="p-4">Stock</th><th className="p-4">Gallery</th><th className="p-4" /></tr></thead><tbody>{filtered.map((product) => <tr key={product.id} className="border-b last:border-0"><td className="p-4"><p className="font-medium">{product.name}</p><p className="text-xs text-gray-500">{product.brand} · {product.sku}</p></td><td className="p-4 text-sm">{product.category?.name || "—"}</td><td className="p-4">{product.discountedPrice ? <><span className="font-semibold">KES {product.discountedPrice.toLocaleString()}</span><span className="ml-2 text-xs text-gray-500 line-through">KES {product.price.toLocaleString()}</span></> : `KES ${product.price.toLocaleString()}`}</td><td className="p-4">{product.stock}</td><td className="p-4 text-sm">{product.images.length} image{product.images.length === 1 ? "" : "s"}</td><td className="p-4"><div className="flex items-center gap-3"><button onClick={() => startEdit(product)} className="inline-flex items-center gap-1 text-sm text-primary"><Pencil size={15} /> Edit</button><Link href={`/store/${storeSlug}/products/${product.slug}`} target="_blank" className="text-sm text-primary">View</Link><button onClick={() => { void remove(product) }} aria-label={`Delete ${product.name}`} className="text-red-500"><Trash2 size={17} /></button></div></td></tr>)}</tbody></table>}{!loading && !filtered.length && <p className="p-10 text-center text-gray-500">No products found.</p>}</div>
	</div>
}
