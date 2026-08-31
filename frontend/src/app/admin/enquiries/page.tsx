"use client"

import { useEffect, useMemo, useState } from "react"

type Enquiry = { id: string; customerName: string; customerEmail: string; customerPhone?: string | null; message?: string | null; contactMethod: string; estimatedTotal: number; status: string; notes?: string | null; items: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number; variant?: string | null }>; createdAt: string; quotes: Array<{ quoteNumber: string; status: string; total: number; createdAt: string }> }

const statuses = ["ALL", "NEW", "CONTACTED", "QUOTED", "WON", "LOST", "SPAM"]

export default function EnquiriesPage() {
	const [enquiries, setEnquiries] = useState<Enquiry[]>([])
	const [status, setStatus] = useState("ALL")
	const [search, setSearch] = useState("")
	const [selected, setSelected] = useState<Enquiry | null>(null)
	const [notes, setNotes] = useState("")
	const [deliveryFee, setDeliveryFee] = useState("0")
	const [terms, setTerms] = useState("")
	const [message, setMessage] = useState("Loading enquiries…")
	const [busy, setBusy] = useState(false)

	async function load() {
		const params = new URLSearchParams({ status, search })
		const response = await fetch(`/api/manage/enquiries?${params}`, { cache: "no-store" })
		const data = await response.json().catch(() => ({}))
		if (!response.ok) throw new Error(data.message || "Unable to load enquiries")
		setEnquiries(data.enquiries || [])
		setMessage("")
	}

	useEffect(() => { load().catch((error) => setMessage(error.message)) }, [status])
	const visible = useMemo(() => enquiries.filter((item) => `${item.customerName} ${item.customerEmail}`.toLowerCase().includes(search.toLowerCase())), [enquiries, search])

	function select(item: Enquiry) { setSelected(item); setNotes(item.notes || "") }

	async function update(data: Record<string, unknown>) {
		if (!selected) return
		setBusy(true); setMessage("")
		try {
			const response = await fetch(`/api/manage/enquiries?id=${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
			const result = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(result.message || "Unable to update enquiry")
			await load(); setSelected(result.enquiry); setNotes(result.enquiry.notes || "")
		} catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Unable to load enquiry") } finally { setBusy(false) }
	}

	async function createQuote() {
		if (!selected) return
		setBusy(true); setMessage("")
		try {
			const response = await fetch(`/api/manage/enquiries/${selected.id}/quote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deliveryFee: Number(deliveryFee) || 0, terms: terms || null }) })
			const result = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(result.message || "Unable to create quote")
			setMessage(`Quote ${result.quote.quoteNumber} created; email delivery was attempted.`); await load()
		} catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Unable to create quote") } finally { setBusy(false) }
	}

	return <div className="space-y-6"><div><h1 className="text-3xl font-bold">Enquiries and quotes</h1><p className="mt-1 text-gray-500">Track shopper handoffs, follow-ups, and merchant-confirmed quotes. Nurava does not record these as completed platform sales.</p></div><div className="glass-card flex flex-wrap gap-3 p-4"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" className="min-w-[220px] flex-1 rounded-lg border bg-transparent px-3 py-2"/><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border bg-transparent px-3 py-2">{statuses.map((item) => <option key={item}>{item}</option>)}</select><button onClick={() => load().catch((error) => setMessage(error.message))} className="rounded-lg border px-4 py-2 font-semibold">Refresh</button></div>{message && <p className="text-sm text-amber-700">{message}</p>}<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]"><section className="glass-card divide-y dark:divide-gray-700">{visible.length ? visible.map((item) => <button key={item.id} onClick={() => select(item)} className={`block w-full p-4 text-left hover:bg-black/5 ${selected?.id === item.id ? "bg-primary/10" : ""}`}><div className="flex flex-wrap items-center justify-between gap-2"><strong>{item.customerName}</strong><span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{item.status}</span></div><p className="mt-1 text-sm text-gray-500">{item.customerEmail} · {item.contactMethod}</p><p className="mt-2 text-sm">{item.items.length} item(s) · Estimated KES {item.estimatedTotal.toLocaleString()}</p><p className="mt-1 text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</p></button>) : <p className="p-8 text-center text-gray-500">No enquiries found.</p>}</section><aside className="glass-card p-5">{selected ? <><h2 className="text-xl font-bold">{selected.customerName}</h2><p className="mt-1 text-sm text-gray-500">{selected.customerEmail}{selected.customerPhone ? ` · ${selected.customerPhone}` : ""}</p>{selected.message && <p className="mt-4 rounded-lg bg-black/5 p-3 text-sm dark:bg-white/5">{selected.message}</p>}<div className="mt-4 space-y-2 text-sm">{selected.items.map((item, index) => <div key={`${item.name}-${index}`} className="flex justify-between gap-3"><span>{item.name} × {item.quantity}</span><span>KES {item.lineTotal.toLocaleString()}</span></div>)}</div><select value={selected.status} onChange={(event) => update({ status: event.target.value })} disabled={busy} className="mt-5 w-full rounded-lg border bg-transparent px-3 py-2">{statuses.filter((item) => item !== "ALL").map((item) => <option key={item}>{item}</option>)}</select><label className="mt-4 block text-sm font-semibold">Internal notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="mt-2 w-full rounded-lg border bg-transparent px-3 py-2"/></label><button onClick={() => update({ notes })} disabled={busy} className="mt-2 rounded-lg border px-3 py-2 text-sm font-semibold">Save notes</button><div className="mt-6 border-t pt-5 dark:border-gray-700"><h3 className="font-semibold">Create quote</h3><input type="number" min="0" value={deliveryFee} onChange={(event) => setDeliveryFee(event.target.value)} placeholder="Delivery fee" className="mt-3 w-full rounded-lg border bg-transparent px-3 py-2"/><textarea value={terms} onChange={(event) => setTerms(event.target.value)} rows={3} placeholder="Quote terms (optional)" className="mt-3 w-full rounded-lg border bg-transparent px-3 py-2"/><button onClick={createQuote} disabled={busy} className="btn-primary mt-3 w-full disabled:opacity-50">Create and email quote</button></div>{selected.quotes.length > 0 && <div className="mt-5 border-t pt-4 dark:border-gray-700"><h3 className="font-semibold">Previous quotes</h3>{selected.quotes.map((quote) => <p key={quote.quoteNumber} className="mt-2 text-sm">{quote.quoteNumber} · KES {quote.total.toLocaleString()} · {quote.status}</p>)}</div>}</> : <p className="text-sm text-gray-500">Select an enquiry to view details and create a quote.</p>}</aside></div></div>
}
