"use client"

import { FormEvent, useEffect, useState } from "react"
import { Loader2, ShieldCheck } from "lucide-react"
import { useToast } from "@/components/ui/Toast"
import { useStoreContext } from "@/lib/store-context"
import { getStoreRouteHref } from "@/lib/store-home"

type Profile = { accountType: "PAYBILL" | "TILL"; shortcode: string; status: string; verifiedAt: string | null; credentialsConfigured: boolean }

export default function ShopperPaymentsPage() {
	const store = useStoreContext()
	const { addToast } = useToast()
	const [profile, setProfile] = useState<Profile | null>(null)
	const [accountType, setAccountType] = useState<"PAYBILL" | "TILL">("PAYBILL")
	const [shortcode, setShortcode] = useState("")
	const [consumerKey, setConsumerKey] = useState("")
	const [consumerSecret, setConsumerSecret] = useState("")
	const [passkey, setPasskey] = useState("")
	const [message, setMessage] = useState("Loading payment settings…")
	const [busy, setBusy] = useState(false)

	useEffect(() => {
		fetch(getStoreRouteHref(store, "/api/manage/shopper-payments"), { cache: "no-store" }).then(async (response) => {
			const data = await response.json()
			if (!response.ok) throw new Error(data.message || "Payment settings unavailable")
			if (data.profile) { setProfile(data.profile); setAccountType(data.profile.accountType); setShortcode(data.profile.shortcode) }
			setMessage("")
		}).catch((error) => setMessage(error instanceof Error ? error.message : "Payment settings unavailable"))
	}, [store])

	async function save(event: FormEvent) {
		event.preventDefault(); setBusy(true); setMessage("")
		try {
			const response = await fetch(getStoreRouteHref(store, "/api/manage/shopper-payments"), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountType, shortcode: shortcode.replace(/\D/g, ""), consumerKey: consumerKey || undefined, consumerSecret: consumerSecret || undefined, passkey: passkey || undefined }) })
			const data = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(data.message || "Unable to save payment settings")
			setProfile(data.profile); setConsumerKey(""); setConsumerSecret(""); setPasskey(""); setMessage(data.message); addToast(data.message, "success")
		} catch (error) { const text = error instanceof Error ? error.message : "Unable to save payment settings"; setMessage(text); addToast(text, "error") } finally { setBusy(false) }
	}

	return <div className="mx-auto max-w-3xl space-y-6"><div><h1 className="text-3xl font-bold">Shopper M-Pesa payments</h1><p className="mt-1 text-gray-500">Route each shopper payment to this store’s verified M-Pesa Paybill or Till. Nurava Tech charges zero commission on product sales.</p></div>{message && <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{message}</p>}<section className="glass-card p-6"><div className="flex items-start gap-3"><ShieldCheck className="mt-1 text-primary" size={22}/><div><h2 className="font-semibold">Merchant-owned payment route</h2><p className="mt-1 text-sm text-gray-500">The route must match the M-Pesa account submitted during merchant verification. Credentials are encrypted on the server and are never returned to the storefront.</p></div></div>{profile && <p className="mt-4 text-sm">Current route: <b>{profile.accountType === "PAYBILL" ? "Paybill" : "Till"} {profile.shortcode}</b> · Status: <b>{profile.status}</b></p>}<form onSubmit={save} className="mt-6 grid gap-4 sm:grid-cols-2"><label className="grid gap-1 text-sm">Account type<select value={accountType} onChange={(event) => setAccountType(event.target.value as "PAYBILL" | "TILL")} className="rounded-lg border p-3"><option value="PAYBILL">Paybill</option><option value="TILL">Till</option></select></label><label className="grid gap-1 text-sm">Verified shortcode<input required inputMode="numeric" value={shortcode} onChange={(event) => setShortcode(event.target.value)} placeholder="Your verified number" className="rounded-lg border p-3"/></label><label className="grid gap-1 text-sm">Daraja consumer key<input value={consumerKey} onChange={(event) => setConsumerKey(event.target.value)} placeholder={profile?.credentialsConfigured ? "Leave blank to keep current" : "Consumer key"} className="rounded-lg border p-3"/></label><label className="grid gap-1 text-sm">Daraja consumer secret<input type="password" value={consumerSecret} onChange={(event) => setConsumerSecret(event.target.value)} placeholder={profile?.credentialsConfigured ? "Leave blank to keep current" : "Consumer secret"} className="rounded-lg border p-3"/></label><label className="grid gap-1 text-sm sm:col-span-2">STK passkey<input type="password" value={passkey} onChange={(event) => setPasskey(event.target.value)} placeholder={profile?.credentialsConfigured ? "Leave blank to keep current" : "STK passkey"} className="rounded-lg border p-3"/></label><button disabled={busy} className="btn-primary inline-flex items-center justify-center gap-2 sm:col-span-2 disabled:opacity-50">{busy && <Loader2 size={17} className="animate-spin"/>}{busy ? "Saving…" : "Save payment route"}</button></form><p className="mt-4 text-xs text-gray-500">Use live Daraja credentials only after sandbox testing and merchant verification. Do not enter an M-Pesa PIN.</p></section></div>
}
