"use client"

import Link from "next/link"
import { ArrowLeft, Loader2, Mail, Store } from "lucide-react"
import { FaWhatsapp } from "react-icons/fa"
import { useState } from "react"
import { useCart } from "@/lib/cartContext"
import { useStoreContext } from "@/lib/store-context"
import { getMerchantEmailHref, getMerchantWhatsAppHref } from "@/lib/merchant-contact"
import { useToast } from "@/components/ui/Toast"
	import { getStoreRouteHref } from "@/lib/store-home"

export default function CheckoutPage() {
	const { items, subtotal } = useCart()
	const store = useStoreContext()
	const { addToast } = useToast()
	const [customerName, setCustomerName] = useState("")
	const [customerEmail, setCustomerEmail] = useState("")
	const [customerPhone, setCustomerPhone] = useState("")
	const [message, setMessage] = useState("")
	const [consent, setConsent] = useState(false)
	const [error, setError] = useState("")
	const [busy, setBusy] = useState(false)
	const [busyMethod, setBusyMethod] = useState<"WHATSAPP" | "EMAIL" | null>(null)

	if (items.length === 0) {
		return <div className="mx-auto max-w-2xl py-20 text-center"><h1 className="text-3xl font-bold">No products selected</h1><p className="mt-3 text-gray-500">Choose a product first, then contact the store directly.</p><Link href={getStoreRouteHref(store, "/products")} className="btn-primary mt-8 inline-flex">Browse products</Link></div>
	}

	const inquiryItems = items.map((item) => ({ name: item.name, quantity: item.quantity, variant: item.variant, price: item.price * item.quantity }))
	const whatsappHref = getMerchantWhatsAppHref({ number: store.contact.whatsappNumber, storeName: store.brand.name, items: inquiryItems })
	const emailHref = getMerchantEmailHref(store.contact.email, store.brand.name, inquiryItems)
	const enquiryItems = items.map((item) => ({ productId: item.productId, quantity: item.quantity, variant: item.variant || null }))

	async function continueToMerchant(contactMethod: "WHATSAPP" | "EMAIL") {
		setError("")
		if (!customerName.trim() || !customerEmail.trim() || !consent) { setError("Enter your name and email, then accept consent so the merchant can follow up."); return }
		setBusy(true); setBusyMethod(contactMethod)
		try {
			const response = await fetch("/api/enquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerName, customerEmail, customerPhone, message, contactMethod, consent, items: enquiryItems }) })
			const result = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(result.message || "Unable to save enquiry")
			addToast("Your enquiry was sent successfully. The merchant will follow up shortly.", "success")
			if (contactMethod === "WHATSAPP") window.open(whatsappHref, "_blank", "noopener,noreferrer")
			else window.location.href = emailHref
		} catch (reason: unknown) { const message = reason instanceof Error ? reason.message : "Unable to save enquiry"; setError(message); addToast(message, "error") } finally { setBusy(false); setBusyMethod(null) }
	}

	return (
		<div className="mx-auto max-w-3xl space-y-8 py-8">
			<Link href={getStoreRouteHref(store, "/cart")} className="inline-flex items-center gap-2 text-gray-500 hover:text-primary"><ArrowLeft size={18} /> Back to selection</Link>
			<div className="glass-card p-6 text-center sm:p-10">
				<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary"><Store size={30} /></div>
				<h1 className="mt-5 text-3xl font-bold">Contact the store to continue</h1>
				<p className="mx-auto mt-3 max-w-xl text-gray-500">Nurava Tech connects you with independent electronics stores. The store will confirm availability, delivery, payment, refunds, and warranty directly with you.</p>
				<div className="mt-8 rounded-xl bg-black/5 p-5 text-left dark:bg-white/5">
					<div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{store.brand.name}</h2><span className="text-sm text-gray-500">{items.length} product{items.length === 1 ? "" : "s"}</span></div>
					<div className="mt-4 space-y-3">{items.map((item) => <div key={item.id} className="flex justify-between gap-4 text-sm"><span>{item.name}{item.variant ? ` · ${item.variant}` : ""} × {item.quantity}</span><span className="font-medium">KES {(item.price * item.quantity).toLocaleString()}</span></div>)}</div>
					<div className="mt-4 flex justify-between border-t border-gray-200 pt-4 font-semibold dark:border-gray-700"><span>Advertised selection total</span><span>KES {subtotal.toLocaleString()}</span></div>
					<p className="mt-3 text-xs text-gray-500">The merchant confirms the final price, delivery cost, taxes, and payment terms.</p>
				</div>
				<div className="mt-8 space-y-3 text-left"><h2 className="font-semibold">Your contact details</h2><div className="grid gap-3 sm:grid-cols-2"><input required value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Full name" className="rounded-lg border bg-transparent px-3 py-3"/><input required type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="Email address" className="rounded-lg border bg-transparent px-3 py-3"/></div><input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="Phone number (optional)" className="w-full rounded-lg border bg-transparent px-3 py-3"/><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Message to the merchant (optional)" rows={3} className="w-full rounded-lg border bg-transparent px-3 py-3"/><label className="flex items-start gap-2 text-sm text-gray-500"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 accent-primary"/><span>I agree that this store may use my details to respond to this enquiry.</span></label>{error && <p className="text-sm text-red-600">{error}</p>}</div>
				<div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" disabled={busy} onClick={() => continueToMerchant("WHATSAPP")} className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50">{busyMethod === "WHATSAPP" ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <FaWhatsapp size={18} />} {busyMethod === "WHATSAPP" ? "Saving…" : "Message on WhatsApp"}</button><button type="button" disabled={busy} onClick={() => continueToMerchant("EMAIL")} className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary px-4 py-3 font-semibold text-primary hover:bg-primary hover:text-white disabled:opacity-50">{busyMethod === "EMAIL" ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Mail size={18} />} {busyMethod === "EMAIL" ? "Saving…" : "Email the store"}</button></div>
				<p className="mt-5 text-xs text-gray-500">You will not enter payment or shipping details on Nurava Tech. The merchant handles the transaction directly.</p>
			</div>
		</div>
	)
}
