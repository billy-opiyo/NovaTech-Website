"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/Toast"
import { useStoreContext } from "@/lib/store-context"
import { getStoreRouteHref } from "@/lib/store-home"

type Result = { mode: string; summary: Record<string, number>; errors?: Array<{ row: number; message: string }> }
type AttributeDefinition = { key: string; name: string; type: "TEXT" | "NUMBER" | "BOOLEAN" | "DROPDOWN" | "MULTI_SELECT"; required: boolean; options: string[] }

function csvCell(value: string) {
	return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

export default function CatalogToolsPage() {
	const store = useStoreContext()
	const { addToast } = useToast()
	const attributesEndpoint = getStoreRouteHref(store, "/api/manage/catalog/attributes")
	const importEndpoint = getStoreRouteHref(store, "/api/manage/catalog/import")
	const exportEndpoint = getStoreRouteHref(store, "/api/manage/catalog/export")
	const [attributeDefinitions, setAttributeDefinitions] = useState<AttributeDefinition[]>([])
	const [attributesLoaded, setAttributesLoaded] = useState(false)
	const [attributesError, setAttributesError] = useState("")
	const [file, setFile] = useState<File | null>(null)
	const [result, setResult] = useState<Result | null>(null)
	const [message, setMessage] = useState("")
	const [busy, setBusy] = useState(false)

	useEffect(() => {
		let active = true
		setAttributesLoaded(false); setAttributesError(""); setAttributeDefinitions([])
		fetch(attributesEndpoint, { cache: "no-store" })
			.then(async (response) => {
				const data = await response.json().catch(() => ({}))
				if (!response.ok) throw new Error(data.message || "Industry product attributes are unavailable.")
				if (active) setAttributeDefinitions(Array.isArray(data.definitions) ? data.definitions : [])
			})
			.catch((error: unknown) => { if (active) setAttributesError(error instanceof Error ? error.message : "Industry product attributes are unavailable.") })
			.finally(() => { if (active) setAttributesLoaded(true) })
		return () => { active = false }
	}, [attributesEndpoint, store.industry?.id])

	async function importCatalog(mode: "preview" | "commit") {
		if (!file) { setMessage("Choose a CSV file first."); return }
		setBusy(true); setMessage("")
		try {
			const body = new FormData(); body.set("file", file); body.set("mode", mode)
			const response = await fetch(importEndpoint, { method: "POST", body })
			const data = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(data.message || "Catalog import failed")
			setResult(data); setMessage(mode === "preview" ? "Preview ready. Review errors before committing." : "Import completed. Valid rows were processed; failed rows were left unchanged."); addToast(mode === "preview" ? "Catalog preview ready" : "Catalog import completed successfully", "success")
		} catch (error: unknown) { const text = error instanceof Error ? error.message : "Catalog import failed"; setMessage(text); addToast(text, "error") } finally { setBusy(false) }
	}

	function downloadTemplate() {
		if (store.industry?.slug === "electronics") {
			const content = "name,slug,description,brand,sku,price,discountedPrice,stock,warranty,category,images,isFeatured,isNewArrival,isTrending,specs,variants\nExample phone,example-phone,Example product description,Example Brand,SKU-001,25000,,5,12 months,Phones,https://example.com/image.jpg,false,true,true,\n"
			const url = URL.createObjectURL(new Blob([content], { type: "text/csv" })); const link = document.createElement("a"); link.href = url; link.download = "nurava-catalog-template.csv"; link.click(); URL.revokeObjectURL(url)
			return
		}
		if (!attributesLoaded || attributesError) {
			setMessage(attributesError || "Industry product fields are still loading. Try downloading the template again shortly.")
			return
		}
		const category = store.homepage.categories[0]?.name || store.industry?.name || "Products"
		const industrySlug = store.industry?.slug
		const example = industrySlug === "cakes"
			? { name: "Chocolate Celebration Cake", description: "A celebration cake made to order.", price: "2800", image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=85" }
			: industrySlug === "furniture"
				? { name: "Walnut Haven Bed", description: "A thoughtfully made furniture piece for your home.", price: "68500", image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=85" }
				: industrySlug === "boutiques"
					? { name: "Everyday Linen Shirt", description: "A comfortable clothing item available in selected sizes and colours.", price: "3200", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=85" }
					: { name: `${store.industry?.name || "Store"} Example Product`, description: `Example product for ${store.industry?.name || "this store"}.`, price: "2500", image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=85" }
		const attributes = Object.fromEntries(attributeDefinitions.map((definition) => [definition.key,
			definition.type === "DROPDOWN" ? definition.options[0] || "" :
				definition.type === "MULTI_SELECT" ? definition.options.slice(0, 2) :
					definition.type === "BOOLEAN" ? false :
						definition.type === "NUMBER" ? 1 : `Example ${definition.name.toLowerCase()}`,
		]))
		const headers = ["name", "slug", "description", "brand", "sku", "price", "discountedPrice", "stock", "category", "images", "isFeatured", "isNewArrival", "isTrending", "variants", "attributes"]
		const values = [example.name, "example-product", example.description, store.brand.name, "SKU-001", example.price, "", "5", category, example.image, "false", "true", "true", "", JSON.stringify(attributes)]
		const content = `${headers.join(",")}\n${values.map(csvCell).join(",")}\n`
		const url = URL.createObjectURL(new Blob([content], { type: "text/csv" })); const link = document.createElement("a"); link.href = url; link.download = "nurava-catalog-template.csv"; link.click(); URL.revokeObjectURL(url)
	}

	return <div className="space-y-6"><div><h1 className="text-3xl font-bold">Catalog import and export</h1><p className="mt-1 text-gray-500">Add or update products in bulk without leaving the merchant workspace.</p></div><section className="glass-card space-y-4 p-6"><h2 className="text-xl font-semibold">Import CSV</h2><p className="text-sm text-gray-500">Use the template columns. Existing products are matched by SKU. New rows are checked against your product entitlement. Maximum 500 rows and 2MB per import.</p><div className="flex flex-wrap gap-3"><button onClick={downloadTemplate} className="rounded-lg border px-4 py-2 font-semibold">Download template</button><a href={exportEndpoint} className="rounded-lg border px-4 py-2 font-semibold">Export current catalog</a></div><input type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] || null)} className="block w-full rounded-lg border p-3"/><p className="text-sm text-gray-500">{file ? file.name : "No file selected"}</p><div className="flex flex-wrap gap-3"><button onClick={() => importCatalog("preview")} disabled={busy || !file} className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 font-semibold text-primary disabled:opacity-50">{busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}Preview import</button><button onClick={() => importCatalog("commit")} disabled={busy || !file || result?.mode !== "preview"} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">{busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}{busy ? "Processing…" : "Commit valid rows"}</button></div>{message && <p className="text-sm text-amber-700">{message}</p>}</section>{result && <section className="glass-card p-6"><h2 className="text-xl font-semibold">{result.mode === "preview" ? "Import preview" : "Import result"}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(result.summary).map(([key, value]) => <div key={key} className="rounded-lg border p-3"><p className="text-xs uppercase text-gray-500">{key}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}</div>{result.errors?.length ? <div className="mt-5"><h3 className="font-semibold text-red-600">Rows requiring attention</h3><div className="mt-2 max-h-72 overflow-auto rounded-lg border">{result.errors.map((error) => <p key={`${error.row}-${error.message}`} className="border-b p-3 text-sm last:border-0">Row {error.row}: {error.message}</p>)}</div></div> : <p className="mt-5 text-sm text-green-600">No validation errors.</p>}</section>}</div>
}
