"use client"

import Link from "next/link"
import { FormEvent, useEffect, useState } from "react"
import { Loader2, MapPin, Plus, Trash2 } from "lucide-react"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import { useToast } from "@/components/ui/Toast"

type Address = { id: string; label: string | null; county: string; town: string; landmark: string | null; phone: string; isDefault: boolean }
type FormState = { label: string; county: string; town: string; landmark: string; phone: string; isDefault: boolean }
const emptyForm: FormState = { label: "", county: "", town: "", landmark: "", phone: "", isDefault: false }

export default function AddressesPage() {
	const [addresses, setAddresses] = useState<Address[]>([])
	const [form, setForm] = useState(emptyForm)
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState("")
	const [addressToRemove, setAddressToRemove] = useState<Address | null>(null)
	const [removing, setRemoving] = useState(false)
	const [defaulting, setDefaulting] = useState(false)
	const { addToast } = useToast()

	const load = () => fetch("/api/account/addresses").then(async (response) => { if (!response.ok) throw new Error("Unable to load your addresses."); return response.json() }).then((data) => setAddresses(data.addresses || [])).catch((reason) => setError(reason.message)).finally(() => setLoading(false))
	useEffect(() => { load() }, [])

	async function addAddress(event: FormEvent) {
		event.preventDefault(); setSaving(true); setError("")
		try {
			const response = await fetch("/api/account/addresses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
			const data = await response.json()
			if (!response.ok) throw new Error(data.message || "Unable to save this address.")
			setForm(emptyForm); addToast("Address saved successfully.", "success"); await load()
		} catch (reason) { const message = reason instanceof Error ? reason.message : "Unable to save this address."; setError(message); addToast(message, "error") } finally { setSaving(false) }
	}

	async function remove() { if (!addressToRemove) return; setRemoving(true); setError(""); try { const response = await fetch(`/api/account/addresses/${addressToRemove.id}`, { method: "DELETE" }); if (!response.ok) throw new Error("Unable to remove this address."); setAddressToRemove(null); addToast("Address removed successfully.", "success"); await load() } catch (reason) { const message = reason instanceof Error ? reason.message : "Unable to remove this address."; setError(message); addToast(message, "error") } finally { setRemoving(false) } }
	async function makeDefault(id: string) { setDefaulting(true); setError(""); try { const response = await fetch(`/api/account/addresses/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isDefault: true }) }); if (!response.ok) throw new Error("Unable to update your default address."); addToast("Default address updated.", "success"); await load() } catch (reason) { const message = reason instanceof Error ? reason.message : "Unable to update your default address."; setError(message); addToast(message, "error") } finally { setDefaulting(false) } }

	return <div className="mx-auto max-w-3xl space-y-6 py-6 sm:py-10"><ConfirmDialog open={Boolean(addressToRemove)} title="Remove saved address?" description="This delivery address will be permanently removed from your account." confirmLabel="Remove address" busy={removing} onCancel={() => { if (!removing) setAddressToRemove(null) }} onConfirm={() => { void remove() }} /><div className="flex flex-wrap items-center justify-between gap-3"><div><Link href="/account" className="text-sm text-gray-500 hover:text-primary">Back to account</Link><h1 className="mt-2 text-3xl font-bold">Saved addresses</h1></div></div><form onSubmit={addAddress} className="glass-card grid gap-4 p-6 sm:grid-cols-2"><h2 className="sm:col-span-2 text-xl font-semibold">Add delivery address</h2>{([["label", "Label (optional)"], ["county", "County"], ["town", "Town"], ["landmark", "Landmark (optional)"], ["phone", "Phone"]] as const).map(([key, label]) => <label key={key} className="block text-sm font-medium">{label}<input required={key === "county" || key === "town" || key === "phone"} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-2 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary" /></label>)}<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isDefault} onChange={(event) => setForm({ ...form, isDefault: event.target.checked })} className="h-4 w-4 accent-primary" /> Make this my default address</label><button disabled={saving} className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50">{saving ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <Plus size={17} />}{saving ? "Saving…" : "Save address"}</button>{error && <p className="sm:col-span-2 text-sm text-red-500">{error}</p>}</form>{loading ? <p className="py-10 text-center text-gray-500">Loading addresses…</p> : addresses.length === 0 ? <div className="glass-card p-8 text-center text-gray-500"><MapPin className="mx-auto mb-3 text-primary" size={32} />No saved addresses yet.</div> : <div className="grid gap-4 sm:grid-cols-2">{addresses.map((address) => <article key={address.id} className="glass-card space-y-3 p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{address.label || "Delivery address"}</h2><p className="text-sm text-gray-500">{address.town}, {address.county}</p></div>{address.isDefault && <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">Default</span>}</div>{address.landmark && <p className="text-sm">Near {address.landmark}</p>}<p className="text-sm text-gray-500">{address.phone}</p><div className="flex gap-3 text-sm">{!address.isDefault && <button disabled={defaulting} onClick={() => makeDefault(address.id)} className="inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-50">{defaulting && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}Make default</button>}<button disabled={defaulting} onClick={() => setAddressToRemove(address)} className="inline-flex items-center gap-1 text-red-500 hover:underline disabled:opacity-50"><Trash2 size={15} /> Remove</button></div></article>)}</div>}</div>
}
