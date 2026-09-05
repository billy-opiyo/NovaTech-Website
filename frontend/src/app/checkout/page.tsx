"use client"

import Link from "next/link"
import { ArrowLeft, Loader2, Mail, MapPin, Store } from "lucide-react"
import { FaWhatsapp } from "react-icons/fa"
import { useState } from "react"
import { useCart } from "@/lib/cartContext"
import { useStoreContext } from "@/lib/store-context"
import { getMerchantEmailHref, getMerchantWhatsAppHref } from "@/lib/merchant-contact"
import { useToast } from "@/components/ui/Toast"
import { getStoreRouteHref } from "@/lib/store-home"

type BusyMethod = "MPESA" | "WHATSAPP" | "EMAIL" | null

export default function CheckoutPage() {
	const { items, subtotal, shippingEstimate, clearCart } = useCart()
	const store = useStoreContext()
	const { addToast } = useToast()
	const [customerName, setCustomerName] = useState("")
	const [customerEmail, setCustomerEmail] = useState("")
	const [customerPhone, setCustomerPhone] = useState("")
	const [county, setCounty] = useState("")
	const [town, setTown] = useState("")
	const [address, setAddress] = useState("")
	const [landmark, setLandmark] = useState("")
	const [message, setMessage] = useState("")
	const [consent, setConsent] = useState(false)
	const [error, setError] = useState("")
	const [success, setSuccess] = useState("")
	const [busy, setBusy] = useState<BusyMethod>(null)

	if (items.length === 0 && !success) {
		return <div className="mx-auto max-w-2xl py-20 text-center"><h1 className="text-3xl font-bold">No products selected</h1><p className="mt-3 text-gray-500">Choose a product first, then return here to pay or contact the store.</p><Link href={getStoreRouteHref(store, "/products")} className="btn-primary mt-8 inline-flex">Browse products</Link></div>
	}

	const inquiryItems = items.map((item) => ({ name: item.name, quantity: item.quantity, variant: item.variant, price: item.price * item.quantity }))
	const whatsappHref = getMerchantWhatsAppHref({ number: store.contact.whatsappNumber, storeName: store.brand.name, items: inquiryItems })
	const emailHref = getMerchantEmailHref(store.contact.email, store.brand.name, inquiryItems)
	const enquiryItems = items.map((item) => ({ productId: item.productId, quantity: item.quantity, variant: item.variant || null }))

	function validateContactDetails(requireAddress: boolean) {
		if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) return "Enter your name, email, and M-Pesa phone number."
		if (requireAddress && (!county.trim() || !town.trim() || !address.trim())) return "Enter your county, town, and delivery address."
		if (!consent) return "Accept the consent so the merchant can process this request."
		return ""
	}

	async function payWithMpesa() {
		setError(""); setSuccess("")
		const validationError = validateContactDetails(true)
		if (validationError) { setError(validationError); return }
		setBusy("MPESA")
		try {
			const orderResponse = await fetch(getStoreRouteHref(store, "/api/orders"), { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ items: enquiryItems, shippingAddress: { fullName: customerName.trim(), phone: customerPhone.trim(), email: customerEmail.trim().toLowerCase(), county: county.trim(), town: town.trim(), address: address.trim(), landmark: landmark.trim() || undefined }, deliveryMethod: "standard", paymentMethod: "MPESA", subtotal, shippingCost: shippingEstimate, total: subtotal + shippingEstimate, notes: message.trim() || undefined }) })
			const order = await orderResponse.json().catch(() => ({}))
			if (!orderResponse.ok) throw new Error(order.message || "Unable to create the order")
			const reference = `ORD-${String(order.id).slice(-8).toUpperCase()}`
			const paymentResponse = await fetch(getStoreRouteHref(store, "/api/payments/mpesa/initiate"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: order.id, amount: order.total, phone: customerPhone.trim(), reference }) })
			const payment = await paymentResponse.json().catch(() => ({}))
			if (!paymentResponse.ok || !payment.ok) throw new Error(payment.message || "Unable to start the M-Pesa payment")
			addToast("M-Pesa prompt sent. Enter your PIN on your phone.", "info")

			for (let attempt = 0; attempt < 8; attempt += 1) {
				await new Promise((resolve) => window.setTimeout(resolve, 3500))
				const verifyResponse = await fetch(getStoreRouteHref(store, "/api/payments/mpesa/verify"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference }) })
				const verification = await verifyResponse.json().catch(() => ({}))
				if (verification.status === "COMPLETED") {
					clearCart(); setSuccess(`Payment received. Order #${String(order.id).slice(-8).toUpperCase()} is confirmed by ${store.brand.name}.`); addToast("M-Pesa payment completed successfully.", "success"); return
				}
				if (verification.status === "FAILED" || verification.status === "CANCELLED") throw new Error(verification.message || "M-Pesa payment was not completed")
			}
			setSuccess(`Your M-Pesa request is still pending. Order #${String(order.id).slice(-8).toUpperCase()} will be confirmed automatically after provider confirmation.`)
		} catch (reason) {
			const text = reason instanceof Error ? reason.message : "Unable to complete M-Pesa payment"
			setError(text); addToast(text, "error")
		} finally { setBusy(null) }
	}

	async function continueToMerchant(contactMethod: "WHATSAPP" | "EMAIL") {
		setError("")
		const validationError = validateContactDetails(false)
		if (validationError) { setError(validationError); return }
		setBusy(contactMethod)
		try {
			const response = await fetch(getStoreRouteHref(store, "/api/enquiries"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerName, customerEmail, customerPhone, message, contactMethod, consent, items: enquiryItems }) })
			const result = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(result.message || "Unable to save enquiry")
			addToast("Your enquiry was sent successfully. The merchant will follow up shortly.", "success")
			if (contactMethod === "WHATSAPP") window.open(whatsappHref, "_blank", "noopener,noreferrer")
			else window.location.href = emailHref
		} catch (reason) { const text = reason instanceof Error ? reason.message : "Unable to save enquiry"; setError(text); addToast(text, "error") } finally { setBusy(null) }
	}

	return <div className="mx-auto max-w-3xl space-y-8 py-8"><Link href={getStoreRouteHref(store, "/cart")} className="inline-flex items-center gap-2 text-gray-500 hover:text-primary"><ArrowLeft size={18}/> Back to cart</Link><div className="glass-card p-6 sm:p-10"><div className="text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary"><Store size={30}/></div><h1 className="mt-5 text-3xl font-bold">Checkout with {store.brand.name}</h1><p className="mx-auto mt-3 max-w-xl text-gray-500">Pay securely through the merchant’s verified M-Pesa route. Nurava Tech does not receive commissions from this product sale.</p></div>{success ? <div className="mt-8 rounded-xl border border-green-300 bg-green-50 p-5 text-center text-green-800"><p className="font-semibold">{success}</p><Link href={getStoreRouteHref(store, "/")} className="mt-4 inline-flex font-semibold underline">Continue shopping</Link></div> : <><div className="mt-8 rounded-xl bg-black/5 p-5 dark:bg-white/5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Order summary</h2><span className="text-sm text-gray-500">{items.length} item{items.length === 1 ? "" : "s"}</span></div><div className="mt-4 space-y-3 text-sm">{items.map((item) => <div key={item.id} className="flex justify-between gap-4"><span>{item.name}{item.variant ? ` · ${item.variant}` : ""} × {item.quantity}</span><span className="font-medium">KES {(item.price * item.quantity).toLocaleString()}</span></div>)}</div><div className="mt-4 flex justify-between border-t border-gray-200 pt-4 font-semibold dark:border-gray-700"><span>Total estimate</span><span>KES {(subtotal + shippingEstimate).toLocaleString()}</span></div></div><div className="mt-8 space-y-3 text-left"><h2 className="font-semibold">Customer and delivery details</h2><div className="grid gap-3 sm:grid-cols-2"><input required value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Full name" className="rounded-lg border bg-transparent px-3 py-3"/><input required type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="Email address" className="rounded-lg border bg-transparent px-3 py-3"/></div><input required value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="M-Pesa phone number (07XXXXXXXX)" className="w-full rounded-lg border bg-transparent px-3 py-3"/><div className="grid gap-3 sm:grid-cols-2"><input required value={county} onChange={(event) => setCounty(event.target.value)} placeholder="County" className="rounded-lg border bg-transparent px-3 py-3"/><input required value={town} onChange={(event) => setTown(event.target.value)} placeholder="Town" className="rounded-lg border bg-transparent px-3 py-3"/></div><div className="relative"><MapPin size={17} className="absolute left-3 top-3 text-gray-400"/><input required value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Delivery address" className="w-full rounded-lg border bg-transparent py-3 pl-10 pr-3"/></div><input value={landmark} onChange={(event) => setLandmark(event.target.value)} placeholder="Landmark (optional)" className="w-full rounded-lg border bg-transparent px-3 py-3"/><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Note to the merchant (optional)" rows={3} className="w-full rounded-lg border bg-transparent px-3 py-3"/><label className="flex items-start gap-2 text-sm text-gray-500"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 accent-primary"/><span>I agree that this store may use my details to process and respond to this order.</span></label>{error && <p className="text-sm text-red-600">{error}</p>}</div><div className="mt-5 grid gap-3"><button type="button" disabled={busy !== null} onClick={() => void payWithMpesa()} className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50">{busy === "MPESA" && <Loader2 size={18} className="animate-spin"/>}{busy === "MPESA" ? "Starting M-Pesa…" : "Pay with M-Pesa"}</button><p className="text-center text-xs text-gray-500">M-Pesa requests are routed to the merchant’s verified Paybill or Till. The merchant handles delivery, warranty, refunds, and disputes.</p><div className="grid gap-3 sm:grid-cols-2"><button type="button" disabled={busy !== null} onClick={() => void continueToMerchant("WHATSAPP")} className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary px-4 py-3 font-semibold text-primary hover:bg-primary hover:text-white disabled:opacity-50">{busy === "WHATSAPP" ? <Loader2 size={18} className="animate-spin"/> : <FaWhatsapp size={18}/>} {busy === "WHATSAPP" ? "Saving…" : "Message on WhatsApp instead"}</button><button type="button" disabled={busy !== null} onClick={() => void continueToMerchant("EMAIL")} className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary px-4 py-3 font-semibold text-primary hover:bg-primary hover:text-white disabled:opacity-50">{busy === "EMAIL" ? <Loader2 size={18} className="animate-spin"/> : <Mail size={18}/>} {busy === "EMAIL" ? "Saving…" : "Email the store instead"}</button></div></div></> }</div></div>
}
