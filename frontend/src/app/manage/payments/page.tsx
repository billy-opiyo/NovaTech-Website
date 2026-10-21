"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import { Loader2, ShieldCheck } from "lucide-react"
import { useToast } from "@/components/ui/Toast"
import { useStoreContext } from "@/lib/store-context"
import { getStoreRouteHref } from "@/lib/store-home"

type Profile = { accountType: "PAYBILL" | "TILL" | "PHONE"; shortcode: string; accountName: string; status: string; verifiedAt: string | null; credentialsConfigured: boolean }
type ManualReceipt = { id: string; orderId: string | null; amount: number; currency: string; providerReference: string | null; phoneNumber: string | null; createdAt: string; order: { id: string; shippingAddress: { fullName?: string; phone?: string } | null } | null }

export default function ShopperPaymentsPage() {
	const store = useStoreContext()
	const shopperPaymentsUrl = getStoreRouteHref(store, "/api/manage/shopper-payments")
	const manualReceiptsUrl = getStoreRouteHref(store, "/api/manage/shopper-payments/manual-receipts")
	const { addToast } = useToast()
	const [profile, setProfile] = useState<Profile | null>(null)
	const [accountType, setAccountType] = useState<"PAYBILL" | "TILL" | "PHONE">("PAYBILL")
	const [shortcode, setShortcode] = useState("")
	const [accountName, setAccountName] = useState("")
	const [consumerKey, setConsumerKey] = useState("")
	const [consumerSecret, setConsumerSecret] = useState("")
	const [passkey, setPasskey] = useState("")
	const [message, setMessage] = useState("Loading payment settings…")
	const [busy, setBusy] = useState(false)
	const [testMode, setTestMode] = useState(false)
	const [receipts, setReceipts] = useState<ManualReceipt[]>([])
	const [reviewing, setReviewing] = useState<string | null>(null)

	useEffect(() => {
		fetch(shopperPaymentsUrl, { cache: "no-store" }).then(async (response) => {
			const data = await response.json()
			if (!response.ok) throw new Error(data.message || "Payment settings unavailable")
			setTestMode(Boolean(data.testMode))
			if (data.profile) { setProfile(data.profile); setAccountType(data.profile.accountType); setShortcode(data.profile.shortcode); setAccountName(data.profile.accountName || "") }
			setMessage("")
		}).catch((error) => setMessage(error instanceof Error ? error.message : "Payment settings unavailable"))
	}, [shopperPaymentsUrl])

	const loadReceipts = useCallback(async () => {
		try {
			const response = await fetch(manualReceiptsUrl, { cache: "no-store" })
			if (response.ok) { const data = await response.json(); setReceipts(data.receipts || []) }
		} catch { /* Receipt review is an optional permission-gated section. */ }
	}, [manualReceiptsUrl])
	useEffect(() => { void loadReceipts() }, [loadReceipts])

	async function save(event: FormEvent) {
		event.preventDefault(); setBusy(true); setMessage("")
		try {
			const response = await fetch(getStoreRouteHref(store, "/api/manage/shopper-payments"), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountType, shortcode: accountType === "PHONE" ? shortcode : shortcode.replace(/\D/g, ""), accountName, consumerKey: consumerKey || undefined, consumerSecret: consumerSecret || undefined, passkey: passkey || undefined }) })
			const data = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(data.message || "Unable to save payment settings")
			setProfile(data.profile); setConsumerKey(""); setConsumerSecret(""); setPasskey(""); setMessage(data.message); addToast(data.message, "success")
		} catch (error) { const text = error instanceof Error ? error.message : "Unable to save payment settings"; setMessage(text); addToast(text, "error") } finally { setBusy(false) }
	}

	async function reviewReceipt(paymentId: string, approve: boolean) {
		setReviewing(paymentId)
		try {
			const response = await fetch(getStoreRouteHref(store, "/api/manage/shopper-payments/manual-receipts"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentId, approve }) })
			const result = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(result.message || "Unable to review receipt")
			addToast(result.message || (approve ? "Receipt verified" : "Receipt rejected"), "success")
			await loadReceipts()
		} catch (error) { addToast(error instanceof Error ? error.message : "Unable to review receipt", "error") } finally { setReviewing(null) }
	}

	return <div className="mx-auto max-w-3xl space-y-6"><div><h1 className="text-3xl font-bold">Shopper M-Pesa payments</h1><p className="mt-1 text-gray-500">Route shopper payments directly to your Paybill, Till, or registered M-Pesa phone. The platform charges zero commission on product sales.</p></div>{testMode && <p className="rounded-lg border border-blue-300 bg-blue-50 p-4 text-sm text-blue-900">Staging test mode is active for this demo store. Sandbox credentials are read from the staging environment; no merchant verification or live payment route is used.</p>}{message && <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{message}</p>}<section className="glass-card p-6"><div className="flex items-start gap-3"><ShieldCheck className="mt-1 text-primary" size={22}/><div><h2 className="font-semibold">Merchant-owned payment route</h2><p className="mt-1 text-sm text-gray-500">Paybill and Till use your encrypted Daraja credentials for automatic STK prompts. A registered phone uses manual Send Money; shoppers submit a receipt and your store must verify it before an order is confirmed.</p></div></div>{profile && <p className="mt-4 text-sm">Current route: <b>{profile.accountType === "PAYBILL" ? "Paybill" : profile.accountType === "TILL" ? "Till" : "Registered phone"} {profile.shortcode}</b> · Account name: <b>{profile.accountName || "Not supplied"}</b> · Status: <b>{profile.status}</b></p>}<form onSubmit={save} className="mt-6 grid gap-4 sm:grid-cols-2"><label className="grid gap-1 text-sm">Account type<select value={accountType} onChange={(event) => { setAccountType(event.target.value as "PAYBILL" | "TILL" | "PHONE"); setShortcode("") }} className="rounded-lg border p-3"><option value="PAYBILL">Paybill (automatic STK)</option><option value="TILL">Till (automatic STK)</option><option value="PHONE">Registered M-Pesa phone (manual)</option></select></label><label className="grid gap-1 text-sm">{accountType === "PHONE" ? "Registered M-Pesa phone number" : `${accountType === "TILL" ? "Till" : "Paybill"} number`}<input required inputMode="numeric" value={shortcode} onChange={(event) => setShortcode(event.target.value)} placeholder={accountType === "PHONE" ? "07XXXXXXXX" : "Your business number"} className="rounded-lg border p-3"/></label><label className="grid gap-1 text-sm sm:col-span-2">M-Pesa account/business name<input required value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="Name shown for your merchant account" className="rounded-lg border p-3"/></label>{accountType !== "PHONE" && <><label className="grid gap-1 text-sm">Daraja consumer key<input value={consumerKey} onChange={(event) => setConsumerKey(event.target.value)} placeholder={profile?.credentialsConfigured ? "Leave blank to keep current" : "Consumer key"} className="rounded-lg border p-3"/></label><label className="grid gap-1 text-sm">Daraja consumer secret<input type="password" value={consumerSecret} onChange={(event) => setConsumerSecret(event.target.value)} placeholder={profile?.credentialsConfigured ? "Leave blank to keep current" : "Consumer secret"} className="rounded-lg border p-3"/></label><label className="grid gap-1 text-sm sm:col-span-2">STK passkey<input type="password" value={passkey} onChange={(event) => setPasskey(event.target.value)} placeholder={profile?.credentialsConfigured ? "Leave blank to keep current" : "STK passkey"} className="rounded-lg border p-3"/></label></>}<button disabled={busy || testMode} className="btn-primary inline-flex items-center justify-center gap-2 sm:col-span-2 disabled:opacity-50">{busy && <Loader2 size={17} className="animate-spin"/>}{busy ? "Saving…" : "Save payment route"}</button></form>{accountType === "PHONE" ? <p className="mt-4 text-xs text-amber-700">Phone transfers do not use Daraja credentials or automatic payment confirmation. The merchant must verify each receipt against their M-Pesa statement before confirming its order.</p> : <p className="mt-4 text-xs text-gray-500">This form never asks for an M-Pesa PIN. Use live Daraja credentials only after sandbox testing and approval from your payment provider.</p>}</section>{receipts.length > 0 && <section className="glass-card space-y-3 p-5"><div><h2 className="text-xl font-semibold">Shopper phone-transfer receipts</h2><p className="mt-1 text-sm text-amber-800">Check the M-Pesa statement for the exact amount and receipt before approving. Approval confirms the order.</p></div>{receipts.map((receipt) => <article key={receipt.id} className="flex flex-wrap items-center justify-between gap-3 border-t py-3 text-sm"><div><b>Order #{(receipt.orderId || receipt.id).slice(-8).toUpperCase()}</b><p>{receipt.order?.shippingAddress?.fullName || "Shopper"} · {receipt.order?.shippingAddress?.phone || receipt.phoneNumber || "No phone"}</p><p>KES {receipt.amount.toLocaleString()} · receipt {receipt.providerReference || "missing"}</p></div><div className="flex gap-2"><button disabled={reviewing === receipt.id} onClick={() => void reviewReceipt(receipt.id, true)} className="rounded border border-emerald-600 px-3 py-1 font-semibold text-emerald-700">{reviewing === receipt.id ? "Reviewing…" : "Verify"}</button><button disabled={reviewing === receipt.id} onClick={() => void reviewReceipt(receipt.id, false)} className="rounded border border-red-600 px-3 py-1 font-semibold text-red-700">Reject</button></div></article>)}</section>}</div>
}
