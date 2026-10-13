"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Loader2, Mail, MapPin, Store } from "lucide-react"
import { FaWhatsapp } from "react-icons/fa"
import { useEffect, useRef, useState } from "react"
import { Browser } from "@capacitor/browser"
import { Capacitor } from "@capacitor/core"
import { useCart } from "@/lib/cartContext"
import { useStoreContext } from "@/lib/store-context"
import { getMerchantEmailHref, getMerchantWhatsAppHref } from "@/lib/merchant-contact"
import { getProductEnquiryTopics } from "@/lib/industry-copy"
import { useToast } from "@/components/ui/Toast"
import { getStoreRouteHref } from "@/lib/store-home"

type BusyMethod = "MPESA" | "COD" | "WHATSAPP" | "EMAIL" | null
type PaymentOptions = { stkAvailable: boolean; manualTransfer: { phone: string; accountName: string } | null }
type ManualCheckout = { orderId: string; paymentId: string; phone: string; accountName: string; amount: number; currency: string; submitted: boolean; failed?: boolean; settlementIssue?: boolean }

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
	const [mpesaPromptSent, setMpesaPromptSent] = useState(false)
	const [paymentOptions, setPaymentOptions] = useState<PaymentOptions | null>(null)
	const [awaitingManual, setAwaitingManual] = useState<ManualCheckout | null>(null)
	const [receiptCode, setReceiptCode] = useState("")
	const orderAttempt = useRef<{ fingerprint: string; key: string; storageKey: string } | null>(null)
	useEffect(() => {
		let active = true
		fetch(getStoreRouteHref(store, "/api/payments/mpesa/initiate"), { cache: "no-store" }).then(async (response) => {
			const data = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(data.message || "M-Pesa payment options unavailable")
			if (active) setPaymentOptions(data)
		}).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "M-Pesa payment options unavailable") })
		return () => { active = false }
	}, [store])
	useEffect(() => {
		if (!awaitingManual?.submitted) return
		const timer = window.setInterval(() => {
			fetch(getStoreRouteHref(store, "/api/payments/mpesa/initiate"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "CHECK_STATUS", orderId: awaitingManual.orderId, paymentId: awaitingManual.paymentId, phone: customerPhone.trim() }) })
				.then(async (response) => response.ok ? response.json() : null)
				.then((result) => {
					if (result?.status === "COMPLETED" && result.orderStatus !== "CANCELLED" && result.orderStatus !== "PENDING" && !result.settlementIssue) { setAwaitingManual(null); setSuccess(`Phone-transfer payment received. Order #${awaitingManual.orderId.slice(-8).toUpperCase()} is confirmed by ${store.brand.name}.`); addToast("Merchant verified your M-Pesa receipt.", "success") }
					else if (result?.status === "COMPLETED" && result.settlementIssue) setAwaitingManual((current) => current?.paymentId === awaitingManual.paymentId ? { ...current, settlementIssue: true } : current)
					else if (result?.status === "FAILED") setAwaitingManual((current) => current?.paymentId === awaitingManual.paymentId ? { ...current, failed: true } : current)
				}).catch(() => undefined)
		}, 6000)
		return () => window.clearInterval(timer)
	}, [awaitingManual, customerPhone, store, addToast])

	if (items.length === 0 && !success && !awaitingManual) return <div className="mx-auto max-w-2xl py-20 text-center"><h1 className="text-3xl font-bold">No products selected</h1><p className="mt-3 text-gray-500">Choose a product first, then return here to pay or contact the store.</p><Link href={getStoreRouteHref(store, "/products")} className="btn-primary mt-8 inline-flex">Browse products</Link></div>

	const customizationText = (item: (typeof items)[number]) => Object.entries(item.customizations || {}).map(([key, value]) => `${key.replaceAll(/([A-Z])/g, " $1")}: ${value}`).join(", ")
	const inquiryItems = items.map((item) => ({ name: item.name, quantity: item.quantity, variant: [item.variant, customizationText(item)].filter(Boolean).join(" · ") || undefined, price: item.price * item.quantity }))
	const whatsappHref = getMerchantWhatsAppHref({ number: store.contact.whatsappNumber, storeName: store.brand.name, industrySlug: store.industry?.slug, items: inquiryItems })
	const emailHref = getMerchantEmailHref(store.contact.email, store.brand.name, inquiryItems)
	const enquiryItems = items.map((item) => ({ productId: item.productId, quantity: item.quantity, ...(item.variant ? { variant: item.variant } : {}), ...(item.customizations ? { customizations: item.customizations } : {}) }))

	function validateContactDetails(requireAddress: boolean) {
		if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) return "Enter your name, email, and phone number."
		if (requireAddress && (!county.trim() || !town.trim() || !address.trim())) return "Enter your county, town, and delivery address."
		if (!consent) return "Accept the consent so the merchant can process this request."
		return ""
	}

	async function createOrder(paymentMethod: "MPESA" | "PAY_ON_DELIVERY") {
		const payload = { items: enquiryItems, shippingAddress: { fullName: customerName.trim(), phone: customerPhone.trim(), email: customerEmail.trim().toLowerCase(), county: county.trim(), town: town.trim(), address: address.trim(), landmark: landmark.trim() || undefined }, deliveryMethod: "standard", paymentMethod, notes: message.trim() || undefined }
		const body = JSON.stringify(payload)
		const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${store.storeId}:${body}`))
		const fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
		const storageKey = `checkout-order-key:${store.storeId}:${fingerprint}`
		if (orderAttempt.current?.fingerprint !== fingerprint) {
			let key = ""
			try { key = sessionStorage.getItem(storageKey) || "" } catch { /* Fall back to this mounted checkout attempt. */ }
			if (!key) {
				key = crypto.randomUUID()
				try { sessionStorage.setItem(storageKey, key) } catch { /* The ref still preserves retries until this page unmounts. */ }
			}
			orderAttempt.current = { fingerprint, key, storageKey }
		}
		return fetch(getStoreRouteHref(store, "/api/orders"), { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": orderAttempt.current.key }, body })
	}

	function clearCheckoutAttempt() {
		if (orderAttempt.current) {
			try { sessionStorage.removeItem(orderAttempt.current.storageKey) } catch { /* Storage can be unavailable in private browsing contexts. */ }
			orderAttempt.current = null
		}
	}

	async function payWithMpesa() {
		setError(""); setSuccess("")
		setMpesaPromptSent(false)
		const validationError = validateContactDetails(true)
		if (validationError) { setError(validationError); return }
		setBusy("MPESA")
		try {
			const orderResponse = await createOrder("MPESA")
			const order = await orderResponse.json().catch(() => ({}))
			if (!orderResponse.ok) throw new Error(order.message || "Unable to create the order")
			const paymentResponse = await fetch(getStoreRouteHref(store, "/api/payments/mpesa/initiate"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: order.id, phone: customerPhone.trim() }) })
			const payment = await paymentResponse.json().catch(() => ({}))
			if (!paymentResponse.ok || !payment.ok) throw new Error(payment.message || "Unable to start the M-Pesa payment")
			addToast("M-Pesa prompt sent. Enter your PIN on your phone.", "info")
			setMpesaPromptSent(true)
			const pendingMessage = `Your M-Pesa request is still pending. Order #${String(order.id).slice(-8).toUpperCase()} will be confirmed automatically after provider confirmation.`
			// The STK prompt has been accepted. Show the pending state immediately
			// instead of keeping checkout in a loading state while Daraja is queried.
			setSuccess(pendingMessage)
			setBusy(null)
			for (let attempt = 0; attempt < 8; attempt += 1) {
				await new Promise((resolve) => window.setTimeout(resolve, 3500))
				const controller = new AbortController()
				const verifyTimeout = window.setTimeout(() => controller.abort(), 12000)
				let verifyResponse: Response
				try {
					verifyResponse = await fetch(getStoreRouteHref(store, "/api/payments/mpesa/verify"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: order.id, phone: customerPhone.trim() }), signal: controller.signal })
				} catch {
					// The STK request was accepted. A lost or slow status response is pending, not proof of failure.
					setSuccess(pendingMessage)
					return
				} finally {
					window.clearTimeout(verifyTimeout)
				}
				const verification = await verifyResponse.json().catch(() => ({}))
				if (!verifyResponse.ok) {
					// Initiation already succeeded; verification transport/auth failures
					// cannot safely be treated as proof that payment failed.
					setSuccess(pendingMessage)
					return
				}
				if (verification.status === "COMPLETED") { clearCheckoutAttempt(); clearCart(); setSuccess(`Payment received. Order #${String(order.id).slice(-8).toUpperCase()} is confirmed by ${store.brand.name}.`); addToast("M-Pesa payment completed successfully.", "success"); return }
				if (verification.status === "FAILED" || verification.status === "CANCELLED") { setSuccess(""); throw new Error(verification.message || "M-Pesa payment was not completed") }
			}
			setSuccess(pendingMessage)
		} catch (reason) { const text = reason instanceof Error ? reason.message : "Unable to complete M-Pesa payment"; setError(text); addToast(text, "error") } finally { setBusy(null); setMpesaPromptSent(false) }
	}

	async function startPhoneTransfer() {
		setError(""); setSuccess("")
		const validationError = validateContactDetails(true)
		if (validationError) { setError(validationError); return }
		setBusy("MPESA")
		try {
			const orderResponse = await createOrder("MPESA")
			const order = await orderResponse.json().catch(() => ({}))
			if (!orderResponse.ok) throw new Error(order.message || "Unable to create the order")
			const paymentResponse = await fetch(getStoreRouteHref(store, "/api/payments/mpesa/initiate"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "PHONE_TRANSFER", orderId: order.id, phone: customerPhone.trim() }) })
			const payment = await paymentResponse.json().catch(() => ({}))
			if (!paymentResponse.ok || !payment.ok) throw new Error(payment.message || "Unable to prepare the phone transfer")
			setAwaitingManual({ orderId: order.id, paymentId: payment.paymentId, phone: payment.phone, accountName: payment.accountName, amount: payment.amount, currency: payment.currency, submitted: false })
			addToast("Order created. Send the exact amount to the merchant and submit its receipt code.", "info")
		} catch (reason) { const text = reason instanceof Error ? reason.message : "Unable to prepare phone transfer"; setError(text); addToast(text, "error") } finally { setBusy(null) }
	}

	async function submitPhoneTransferReceipt() {
		if (!awaitingManual) return
		setError(""); setBusy("MPESA")
		try {
			const response = await fetch(getStoreRouteHref(store, "/api/payments/mpesa/initiate"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "SUBMIT_RECEIPT", orderId: awaitingManual.orderId, paymentId: awaitingManual.paymentId, phone: customerPhone.trim(), receiptCode }) })
			const result = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(result.message || "Unable to submit the receipt")
			setAwaitingManual({ ...awaitingManual, submitted: true }); setReceiptCode(""); clearCheckoutAttempt(); clearCart()
			addToast("Receipt submitted for store verification.", "success")
		} catch (reason) { const text = reason instanceof Error ? reason.message : "Unable to submit the receipt"; setError(text); addToast(text, "error") } finally { setBusy(null) }
	}

	async function retryPhoneTransfer() {
		if (!awaitingManual) return
		setBusy("MPESA"); setError("")
		try {
			const response = await fetch(getStoreRouteHref(store, "/api/payments/mpesa/initiate"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "PHONE_TRANSFER", orderId: awaitingManual.orderId, phone: customerPhone.trim() }) })
			const result = await response.json().catch(() => ({}))
			if (!response.ok || !result.ok) throw new Error(result.message || "Unable to prepare a new transfer")
			setAwaitingManual({ ...awaitingManual, paymentId: result.paymentId, phone: result.phone, accountName: result.accountName, amount: result.amount, currency: result.currency, submitted: false, failed: false })
		} catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to prepare a new transfer") } finally { setBusy(null) }
	}

	async function payOnDelivery() {
		setError(""); setSuccess("")
		const validationError = validateContactDetails(true)
		if (validationError) { setError(validationError); return }
		setBusy("COD")
		try {
			const response = await createOrder("PAY_ON_DELIVERY")
			const order = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(order.message || "Unable to place the order")
			clearCheckoutAttempt(); clearCart(); setSuccess(`Order #${String(order.id).slice(-8).toUpperCase()} was placed with pay on delivery. ${store.brand.name} will contact you to confirm delivery.`); addToast("Order placed successfully.", "success")
		} catch (reason) { const text = reason instanceof Error ? reason.message : "Unable to place the order"; setError(text); addToast(text, "error") } finally { setBusy(null) }
	}

	async function continueToMerchant(contactMethod: "WHATSAPP" | "EMAIL") {
		setError("")
		if (contactMethod === "WHATSAPP" && !whatsappHref) { setError("This store has not configured a WhatsApp number. Choose email or another checkout option."); return }
		const validationError = validateContactDetails(false)
		if (validationError) { setError(validationError); return }
		let whatsappWindow: Window | null = null
		const useNativeBrowser = Capacitor.isNativePlatform()
		if (contactMethod === "WHATSAPP" && !useNativeBrowser) {
			whatsappWindow = window.open("about:blank", "_blank")
			if (!whatsappWindow) { setError("Allow pop-ups for this site to continue to WhatsApp."); return }
			whatsappWindow.opener = null
		}
		setBusy(contactMethod)
		try {
			const response = await fetch(getStoreRouteHref(store, "/api/enquiries"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerName, customerEmail, customerPhone, message, contactMethod, consent, items: enquiryItems }) })
			const result = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(result.message || "Unable to save enquiry")
			addToast("Your enquiry was sent successfully. The merchant will follow up shortly.", "success")
			if (contactMethod === "WHATSAPP") {
				if (useNativeBrowser) {
					try {
						await Browser.open({ url: whatsappHref })
					} catch {
						const openError = "Your enquiry was saved, but WhatsApp could not be opened. You can contact the store directly from its page."
						setError(openError)
						addToast(openError, "error")
					}
				} else if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.location.href = whatsappHref
			} else window.location.href = emailHref
		} catch (reason) { whatsappWindow?.close(); const text = reason instanceof Error ? reason.message : "Unable to save enquiry"; setError(text); addToast(text, "error") } finally { setBusy(null) }
	}

	return (
		<div className="mx-auto max-w-3xl space-y-8 py-8">
			<Link href={getStoreRouteHref(store, "/cart")} className="inline-flex items-center gap-2 text-gray-500 hover:text-primary"><ArrowLeft size={18} /> Back to cart</Link>
			<div className="glass-card p-6 sm:p-10">
				<div className="text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary"><Store size={30} /></div><h1 className="mt-5 text-3xl font-bold">Checkout with {store.brand.name}</h1><p className="mx-auto mt-3 max-w-xl text-gray-500">Choose how you want to complete this purchase. Payment and order fulfilment are handled directly with {store.brand.name}.</p></div>
				{awaitingManual ? <div className="mt-8 rounded-xl border border-amber-300 bg-amber-50 p-5 text-left text-amber-950"><h2 className="text-lg font-semibold">{awaitingManual.settlementIssue ? "Payment needs follow-up with the store" : awaitingManual.failed ? "Receipt could not be verified" : awaitingManual.submitted ? "Payment receipt awaiting verification" : "Send Money to the merchant"}</h2><p className="mt-2">Order #{awaitingManual.orderId.slice(-8).toUpperCase()} · {awaitingManual.currency} {awaitingManual.amount.toLocaleString()}</p><p className="mt-2">Send exactly <b>{awaitingManual.currency} {awaitingManual.amount.toLocaleString()}</b> using M-Pesa Send Money to <b>{awaitingManual.phone}</b>{awaitingManual.accountName ? <> ({awaitingManual.accountName})</> : null}.</p>{awaitingManual.settlementIssue ? <p className="mt-3 text-sm">The store verified the receipt, but the order needs additional handling. Contact the store; do not send the payment again.</p> : awaitingManual.failed ? <div className="mt-3"><p className="text-sm">The store rejected the submitted receipt. Confirm the payment details with the store, then make a new transfer if needed.</p><button type="button" disabled={busy !== null} onClick={() => void retryPhoneTransfer()} className="btn-primary mt-3 px-4 py-2 disabled:opacity-50">{busy === "MPESA" ? "Preparing…" : "Prepare another transfer"}</button></div> : awaitingManual.submitted ? <p className="mt-3 text-sm">The order stays pending until the store verifies the receipt against its M-Pesa account. This page checks for a decision automatically.</p> : <form onSubmit={(event) => { event.preventDefault(); void submitPhoneTransferReceipt() }} className="mt-4 flex flex-wrap items-end gap-3"><label className="grid gap-1 text-sm font-semibold">M-Pesa receipt code<input required minLength={8} maxLength={12} value={receiptCode} onChange={(event) => setReceiptCode(event.target.value.toUpperCase())} placeholder="e.g. QWE1234567" className="rounded border bg-white p-2 font-normal" /></label><button disabled={busy !== null || receiptCode.length < 8} className="btn-primary px-4 py-2 disabled:opacity-50">{busy === "MPESA" ? "Submitting…" : "Submit for verification"}</button></form>}{error && <p className="mt-3 text-sm text-red-700">{error}</p>}<Link href={getStoreRouteHref(store, "/")} className="mt-4 inline-flex font-semibold underline">Continue shopping</Link></div> : success ? <div className="mt-8 rounded-xl border border-green-300 bg-green-50 p-5 text-center text-green-800"><p className="font-semibold">{success}</p><Link href={getStoreRouteHref(store, "/")} className="mt-4 inline-flex font-semibold underline">Continue shopping</Link></div> : <>
					<div className="mt-8 rounded-xl bg-black/5 p-5 dark:bg-white/5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Order summary</h2><span className="text-sm text-gray-500">{items.length} item{items.length === 1 ? "" : "s"}</span></div><div className="mt-4 space-y-3 text-sm">{items.map((item) => <div key={item.id} className="flex justify-between gap-4"><span>{item.name}{item.variant ? ` · ${item.variant}` : ""}{customizationText(item) ? <span className="block text-xs text-primary">{customizationText(item)}</span> : null} × {item.quantity}</span><span className="font-medium">KES {(item.price * item.quantity).toLocaleString()}</span></div>)}</div><div className="mt-4 flex justify-between border-t border-gray-200 pt-4 font-semibold dark:border-gray-700"><span>Total estimate</span><span>KES {(subtotal + shippingEstimate).toLocaleString()}</span></div></div>
					<div className="mt-8 space-y-3 text-left"><h2 className="font-semibold">Customer and delivery details</h2><div className="grid gap-3 sm:grid-cols-2"><input required value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Full name" className="rounded-lg border bg-transparent px-3 py-3" /><input required type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="Email address" className="rounded-lg border bg-transparent px-3 py-3" /></div><input required value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="Phone number (07XXXXXXXX or +2547XXXXXXXX)" className="w-full rounded-lg border bg-transparent px-3 py-3" /><div className="grid gap-3 sm:grid-cols-2"><input required value={county} onChange={(event) => setCounty(event.target.value)} placeholder="County" className="rounded-lg border bg-transparent px-3 py-3" /><input required value={town} onChange={(event) => setTown(event.target.value)} placeholder="Town" className="rounded-lg border bg-transparent px-3 py-3" /></div><div className="relative"><MapPin size={17} className="absolute left-3 top-3 text-gray-400" /><input required value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Delivery address" className="w-full rounded-lg border bg-transparent py-3 pl-10 pr-3" /></div><input value={landmark} onChange={(event) => setLandmark(event.target.value)} placeholder="Landmark (optional)" className="w-full rounded-lg border bg-transparent px-3 py-3" /><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Note to the merchant (optional)" rows={3} className="w-full rounded-lg border bg-transparent px-3 py-3" /><label className="flex items-start gap-2 text-sm text-gray-500"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 accent-primary" /><span>I agree that this store may use my details to process and respond to this order.</span></label>{error && <p className="text-sm text-red-600">{error}</p>}</div>
					<div className="mt-5 space-y-3">
						<div className="grid gap-3 sm:grid-cols-2">
							{paymentOptions?.stkAvailable && <button type="button" disabled={busy !== null} onClick={() => void payWithMpesa()} className="btn-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 sm:text-base"><Image src="/images/Mpesa_logo_image.png" alt="M-Pesa" width={72} height={24} className="h-6 w-[4.5rem] shrink-0 object-contain" />{busy === "MPESA" && !mpesaPromptSent && <Loader2 size={18} className="animate-spin" />}{busy === "MPESA" ? mpesaPromptSent ? "Waiting for confirmation…" : "Starting…" : "Pay with M-Pesa prompt"}</button>}
							{paymentOptions?.manualTransfer && <button type="button" disabled={busy !== null} onClick={() => void startPhoneTransfer()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary hover:text-white disabled:opacity-50 sm:text-base">{busy === "MPESA" && <Loader2 size={18} className="animate-spin" />}Send Money to merchant phone</button>}
							<button type="button" disabled={busy !== null} onClick={() => void payOnDelivery()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary hover:text-white disabled:opacity-50 sm:text-base">{busy === "COD" && <Loader2 size={18} className="animate-spin" />}{busy === "COD" ? "Placing order…" : "Pay on Delivery"}</button>
						</div>
						<p className="text-center text-xs text-gray-500">{paymentOptions === null ? "Loading this store’s M-Pesa payment options…" : "The order is confirmed only after M-Pesa confirms the STK payment or the merchant verifies a submitted phone-transfer receipt."} The merchant confirms {getProductEnquiryTopics(store.industry?.slug)}.</p>
						<p className="text-center text-xs text-gray-500">Pay the merchant when your order is delivered. The merchant confirms delivery terms directly.</p>
						<div className="grid gap-3 sm:grid-cols-2"><button type="button" disabled={busy !== null || !whatsappHref} title={!whatsappHref ? "Store WhatsApp number not configured" : undefined} onClick={() => void continueToMerchant("WHATSAPP")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:text-base">{busy === "WHATSAPP" ? <Loader2 size={18} className="animate-spin" /> : <FaWhatsapp size={18} />} {busy === "WHATSAPP" ? "Saving…" : "Message on WhatsApp instead"}</button><button type="button" disabled={busy !== null} onClick={() => void continueToMerchant("EMAIL")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary hover:text-white disabled:opacity-50 sm:text-base">{busy === "EMAIL" ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />} {busy === "EMAIL" ? "Saving…" : "Email the store instead"}</button></div>
					</div>
				</>}
			</div>
		</div>
	)
}
