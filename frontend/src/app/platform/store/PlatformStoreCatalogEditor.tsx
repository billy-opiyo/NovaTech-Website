"use client"

import { useEffect, useState, type FormEvent } from "react"
import { notifyStoreSettingsPublished } from "@/lib/store-context"
import ConfirmDialog from "@/components/ui/ConfirmDialog"

type Category = { id: string; name: string; industry?: { name: string } | null }
type Supplier = { id: string; name: string }
type Product = { id: string; name: string; slug: string; description: string; brand: string; sku: string; price: number; stock: number; images: string[]; isPublished: boolean; categoryId: string; category: { id: string; name: string }; supplierProduct?: { supplierId: string; supplierReference: string; supplierCost: number; availability: string; estimatedDeliveryMinDays?: number | null; estimatedDeliveryMaxDays?: number | null; deliveryNotes?: string | null } | null }
const input = "w-full rounded-lg border border-gray-300 bg-white p-2 text-sm dark:bg-dark-surface"

export default function PlatformStoreCatalogEditor({ categories, suppliers, products, busy, storeSlug, requestReload, notify }: { categories: Category[]; suppliers: Supplier[]; products: Product[]; busy: boolean; storeSlug: string; requestReload: () => Promise<void>; notify: (message: string) => void }) {
	const [editing, setEditing] = useState<Product | null>(null)
	const [images, setImages] = useState<string[]>([])
	const [uploading, setUploading] = useState(false)
	const [saving, setSaving] = useState(false)
	const [productToDelete, setProductToDelete] = useState<Product | null>(null)
	const [productToUnpublish, setProductToUnpublish] = useState<Product | null>(null)
	const [imageToRemove, setImageToRemove] = useState<string | null>(null)
	useEffect(() => { setImages(editing?.images || []) }, [editing])
	async function upload(files: FileList | null) {
		if (!files?.length) return
		setUploading(true)
		try {
			for (const file of Array.from(files)) {
				const form = new FormData(); form.set("file", file)
				const response = await fetch("/api/platform/store/catalog/upload", { method: "POST", body: form })
				const body = await response.json()
				if (!response.ok) throw new Error(body.message || "Image upload failed")
				setImages((current) => [...current, body.url])
			}
			notify("Product image uploaded")
		} catch (error) { notify(error instanceof Error ? error.message : "Image upload failed") }
		finally { setUploading(false) }
	}
	async function save(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const form = new FormData(event.currentTarget)
		const value = (key: string) => String(form.get(key) || "").trim()
		if (!images.length) { notify("Upload at least one product image before saving."); return }
		setSaving(true)
		try {
			const product = { name: value("name"), slug: value("slug"), description: value("description"), brand: value("brand"), sku: value("sku"), price: Number(value("price")), stock: Number(value("stock")), categoryId: value("categoryId"), images, isPublished: form.get("isPublished") === "on" }
			const supplierProduct = value("supplierId") ? { supplierId: value("supplierId"), supplierReference: value("supplierReference"), supplierCost: Number(value("supplierCost")), currency: "KES", availability: value("availability") || "ON_REQUEST", estimatedDeliveryMinDays: value("estimatedDeliveryMinDays") ? Number(value("estimatedDeliveryMinDays")) : undefined, estimatedDeliveryMaxDays: value("estimatedDeliveryMaxDays") ? Number(value("estimatedDeliveryMaxDays")) : undefined, deliveryNotes: value("deliveryNotes") || undefined } : null
			const response = await fetch(editing ? `/api/platform/store/catalog/products/${editing.id}` : "/api/platform/store/catalog", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing ? { product, supplierProduct } : { action: "create_product", product, supplierProduct }) })
			const body = await response.json()
			if (!response.ok) throw new Error(body.message || "Product could not be saved")
			notifyStoreSettingsPublished({ scope: "store", storeSlug })
			notify(editing ? "Product updated" : "Product added")
			setEditing(null); event.currentTarget.reset(); await requestReload()
		} catch (error) { notify(error instanceof Error ? error.message : "Product could not be saved") }
		finally { setSaving(false) }
	}
	async function remove(product: Product) {
		setProductToDelete(product)
	}
	async function setPublication(product: Product, isPublished: boolean) {
		setSaving(true)
		try { const response = await fetch(`/api/platform/store/catalog/products/${product.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product: { isPublished } }) }); const body = await response.json(); if (!response.ok) throw new Error(body.message || "Publication update failed"); notifyStoreSettingsPublished({ scope: "store", storeSlug }); notify(isPublished ? "Product published" : "Product unpublished"); setProductToUnpublish(null); await requestReload() }
		catch (error) { notify(error instanceof Error ? error.message : "Publication update failed") }
		finally { setSaving(false) }
	}
	async function confirmRemove() {
		if (!productToDelete) return
		setSaving(true)
		try { const response = await fetch(`/api/platform/store/catalog/products/${productToDelete.id}`, { method: "DELETE" }); const body = await response.json(); if (!response.ok) throw new Error(body.message || "Product could not be deleted"); notifyStoreSettingsPublished({ scope: "store", storeSlug }); notify(`${productToDelete.name} deleted`); setProductToDelete(null); await requestReload() }
		catch (error) { notify(error instanceof Error ? error.message : "Product could not be deleted") }
		finally { setSaving(false) }
	}
	const selected = editing
	return <section className="glass-card space-y-5 p-5"><ConfirmDialog open={Boolean(imageToRemove)} title="Remove product image?" description="This image will be removed from the product draft. Save the product to apply the change to the platform store." confirmLabel="Remove image" onCancel={() => setImageToRemove(null)} onConfirm={() => { if (imageToRemove) setImages((current) => current.filter((image) => image !== imageToRemove)); setImageToRemove(null) }} /><ConfirmDialog open={Boolean(productToUnpublish)} title="Unpublish platform store product?" description={productToUnpublish ? `${productToUnpublish.name} will be hidden from the public platform store.` : ""} confirmLabel="Unpublish product" busy={saving} onCancel={() => { if (!saving) setProductToUnpublish(null) }} onConfirm={() => { if (productToUnpublish) void setPublication(productToUnpublish, false) }} /><ConfirmDialog open={Boolean(productToDelete)} title="Delete platform store product?" description={productToDelete ? `${productToDelete.name} will be permanently removed. Products with order history cannot be deleted.` : ""} confirmLabel="Delete product" busy={saving} onCancel={() => { if (!saving) setProductToDelete(null) }} onConfirm={() => { void confirmRemove() }} />
		<div><h3 className="text-xl font-semibold">Product catalog</h3><p className="mt-1 text-sm text-gray-500">Upload product images, review the full catalog, and edit, publish, unpublish, or delete products.</p></div>
		<div className="divide-y">{products.map((product) => <article key={product.id} className="flex flex-wrap items-center gap-4 py-4">
			{product.images[0] && <img src={product.images[0]} alt={`${product.name} product`} className="h-16 w-16 rounded-lg object-cover" />}
			<div className="min-w-0 flex-1"><p className="font-semibold">{product.name}</p><p className="text-sm text-gray-500">{product.category.name} · {product.sku} · KES {product.price.toLocaleString()} · stock {product.stock} · {product.isPublished ? "Published" : "Draft"}</p><p className="text-xs text-gray-500">{product.supplierProduct ? `${product.supplierProduct.availability} · private supplier cost KES ${product.supplierProduct.supplierCost.toLocaleString()}` : "No supplier linked"}</p></div>
			<div className="flex flex-wrap gap-2"><button type="button" disabled={busy || saving} onClick={() => setEditing(product)} className="rounded border px-3 py-1.5 text-xs">Edit</button><button type="button" disabled={busy || saving} onClick={() => product.isPublished ? setProductToUnpublish(product) : void setPublication(product, true)} className="rounded border px-3 py-1.5 text-xs">{product.isPublished ? "Unpublish" : "Publish"}</button><button type="button" disabled={busy || saving} onClick={() => void remove(product)} className="rounded border border-red-500/50 px-3 py-1.5 text-xs text-red-600">Delete</button></div>
		</article>)}</div>
		<form key={selected?.id || "new-product"} onSubmit={(event) => void save(event)} className="space-y-3 rounded-xl border p-4">
			<h4 className="font-semibold">{selected ? `Edit ${selected.name}` : "Add product"}</h4>
			<div className="grid gap-3 sm:grid-cols-2">{([ ["name", "Product name", selected?.name], ["slug", "URL slug", selected?.slug], ["brand", "Brand", selected?.brand], ["sku", "SKU", selected?.sku], ["price", "Selling price (KES)", selected?.price], ["stock", "Available stock", selected?.stock] ] as const).map(([name, label, current]) => <label key={name} className="space-y-1 text-xs"><span>{label}</span><input required name={name} defaultValue={current ?? ""} type={name === "price" || name === "stock" ? "number" : "text"} min={name === "price" ? "0.01" : name === "stock" ? "0" : undefined} className={input}/></label>)}</div>
			<label className="block space-y-1 text-xs"><span>Description</span><textarea required name="description" defaultValue={selected?.description || ""} className={input}/></label>
			<label className="block space-y-1 text-xs"><span>Category</span><select required name="categoryId" defaultValue={selected?.categoryId || ""} className={input}><option value="">Choose active category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.industry?.name}: {category.name}</option>)}</select></label>
			<div className="space-y-2"><label className="inline-flex cursor-pointer rounded-lg border px-3 py-2 text-sm">{uploading ? "Uploading…" : "Upload product images"}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple disabled={uploading || busy} onChange={(event) => { void upload(event.target.files); event.target.value = "" }}/></label><p className="text-xs text-gray-500">JPG, PNG, WEBP, or GIF up to 1 MB each. At least one image is required. No image URL entry.</p><div className="flex flex-wrap gap-2">{images.map((image, index) => <div key={`${image}-${index}`} className="relative"><img src={image} alt={`Product image ${index + 1}`} className="h-16 w-16 rounded object-cover"/><button type="button" aria-label="Remove image" onClick={() => setImageToRemove(image)} className="absolute -right-2 -top-2 rounded-full bg-red-600 px-1.5 text-xs text-white">×</button></div>)}</div></div>
			<div className="grid gap-3 sm:grid-cols-2"><select name="supplierId" defaultValue={selected?.supplierProduct?.supplierId || ""} className={input}><option value="">No supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select><input name="supplierReference" defaultValue={selected?.supplierProduct?.supplierReference || ""} placeholder="Supplier reference" className={input}/><input name="supplierCost" type="number" min="0" step="0.01" defaultValue={selected?.supplierProduct?.supplierCost ?? ""} placeholder="Supplier cost (private) KES" className={input}/><select name="availability" defaultValue={selected?.supplierProduct?.availability || "ON_REQUEST"} className={input}><option>ON_REQUEST</option><option>AVAILABLE</option><option>LOW_STOCK</option><option>OUT_OF_STOCK</option><option>DISCONTINUED</option></select><input name="estimatedDeliveryMinDays" type="number" min="0" defaultValue={selected?.supplierProduct?.estimatedDeliveryMinDays ?? ""} placeholder="Minimum delivery days" className={input}/><input name="estimatedDeliveryMaxDays" type="number" min="0" defaultValue={selected?.supplierProduct?.estimatedDeliveryMaxDays ?? ""} placeholder="Maximum delivery days" className={input}/></div>
			<textarea name="deliveryNotes" defaultValue={selected?.supplierProduct?.deliveryNotes || ""} placeholder="Supplier delivery notes (private)" className={input}/>
			{selected && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPublished" defaultChecked={selected.isPublished}/>Published in storefront</label>}
			<div className="flex gap-2"><button disabled={saving || uploading || busy || !categories.length} className="btn-primary rounded-lg px-4 py-2 text-sm">{saving ? "Saving…" : selected ? "Save product changes" : "Add product"}</button>{selected && <button type="button" onClick={() => setEditing(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel edit</button>}</div>
		</form>
	</section>
}
