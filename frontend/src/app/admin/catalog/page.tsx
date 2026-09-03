"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/Toast"

type Result = { mode: string; summary: Record<string, number>; errors?: Array<{ row: number; message: string }> }

export default function CatalogToolsPage() {
	const { addToast } = useToast()
	const [file, setFile] = useState<File | null>(null)
	const [result, setResult] = useState<Result | null>(null)
	const [message, setMessage] = useState("")
	const [busy, setBusy] = useState(false)

	async function importCatalog(mode: "preview" | "commit") {
		if (!file) { setMessage("Choose a CSV file first."); return }
		setBusy(true); setMessage("")
		try {
			const body = new FormData(); body.set("file", file); body.set("mode", mode)
			const response = await fetch("/api/manage/catalog/import", { method: "POST", body })
			const data = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(data.message || "Catalog import failed")
			setResult(data); setMessage(mode === "preview" ? "Preview ready. Review errors before committing." : "Import completed. Valid rows were processed; failed rows were left unchanged."); addToast(mode === "preview" ? "Catalog preview ready" : "Catalog import completed successfully", "success")
		} catch (error: unknown) { const text = error instanceof Error ? error.message : "Catalog import failed"; setMessage(text); addToast(text, "error") } finally { setBusy(false) }
	}

	function downloadTemplate() {
		const content = "name,slug,description,brand,sku,price,discountedPrice,stock,warranty,category,images,isFeatured,isNewArrival,specs,variants\nExample phone,example-phone,Example product description,Example Brand,SKU-001,25000,,5,12 months,Phones,https://example.com/image.jpg,false,true,\n"
		const url = URL.createObjectURL(new Blob([content], { type: "text/csv" })); const link = document.createElement("a"); link.href = url; link.download = "nurava-catalog-template.csv"; link.click(); URL.revokeObjectURL(url)
	}

	return <div className="space-y-6"><div><h1 className="text-3xl font-bold">Catalog import and export</h1><p className="mt-1 text-gray-500">Add or update products in bulk without leaving the merchant workspace.</p></div><section className="glass-card space-y-4 p-6"><h2 className="text-xl font-semibold">Import CSV</h2><p className="text-sm text-gray-500">Use the template columns. Existing products are matched by SKU. New rows are checked against your product entitlement. Maximum 500 rows and 2MB per import.</p><div className="flex flex-wrap gap-3"><button onClick={downloadTemplate} className="rounded-lg border px-4 py-2 font-semibold">Download template</button><a href="/api/manage/catalog/export" className="rounded-lg border px-4 py-2 font-semibold">Export current catalog</a></div><input type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] || null)} className="block w-full rounded-lg border p-3"/><p className="text-sm text-gray-500">{file ? file.name : "No file selected"}</p><div className="flex flex-wrap gap-3"><button onClick={() => importCatalog("preview")} disabled={busy || !file} className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 font-semibold text-primary disabled:opacity-50">{busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}Preview import</button><button onClick={() => importCatalog("commit")} disabled={busy || !file || result?.mode !== "preview"} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">{busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}{busy ? "Processing…" : "Commit valid rows"}</button></div>{message && <p className="text-sm text-amber-700">{message}</p>}</section>{result && <section className="glass-card p-6"><h2 className="text-xl font-semibold">{result.mode === "preview" ? "Import preview" : "Import result"}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(result.summary).map(([key, value]) => <div key={key} className="rounded-lg border p-3"><p className="text-xs uppercase text-gray-500">{key}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}</div>{result.errors?.length ? <div className="mt-5"><h3 className="font-semibold text-red-600">Rows requiring attention</h3><div className="mt-2 max-h-72 overflow-auto rounded-lg border">{result.errors.map((error) => <p key={`${error.row}-${error.message}`} className="border-b p-3 text-sm last:border-0">Row {error.row}: {error.message}</p>)}</div></div> : <p className="mt-5 text-sm text-green-600">No validation errors.</p>}</section>}</div>
}
