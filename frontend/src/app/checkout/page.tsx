"use client"

import Link from "next/link"
import { ArrowLeft, Mail, MessageCircle, Store } from "lucide-react"
import { useCart } from "@/lib/cartContext"
import { useStoreContext } from "@/lib/store-context"
import { getMerchantEmailHref, getMerchantWhatsAppHref } from "@/lib/merchant-contact"

export default function CheckoutPage() {
	const { items, subtotal } = useCart()
	const store = useStoreContext()

	if (items.length === 0) {
		return <div className="mx-auto max-w-2xl py-20 text-center"><h1 className="text-3xl font-bold">No products selected</h1><p className="mt-3 text-gray-500">Choose a product first, then contact the store directly.</p><Link href="/products" className="btn-primary mt-8 inline-flex">Browse products</Link></div>
	}

	const inquiryItems = items.map((item) => ({ name: item.name, quantity: item.quantity, variant: item.variant, price: item.price * item.quantity }))
	const whatsappHref = getMerchantWhatsAppHref({ number: store.contact.whatsappNumber, storeName: store.brand.name, items: inquiryItems })
	const emailHref = getMerchantEmailHref(store.contact.email, store.brand.name, inquiryItems)

	return (
		<div className="mx-auto max-w-3xl space-y-8 py-8">
			<Link href="/cart" className="inline-flex items-center gap-2 text-gray-500 hover:text-primary"><ArrowLeft size={18} /> Back to selection</Link>
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
				<div className="mt-8 grid gap-3 sm:grid-cols-2"><a href={whatsappHref} target="_blank" rel="noreferrer" className="btn-primary inline-flex items-center justify-center gap-2"><MessageCircle size={18} /> Message on WhatsApp</a><a href={emailHref} className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary px-4 py-3 font-semibold text-primary hover:bg-primary hover:text-white"><Mail size={18} /> Email the store</a></div>
				<p className="mt-5 text-xs text-gray-500">You will not enter payment or shipping details on Nurava Tech. The merchant handles the transaction directly.</p>
			</div>
		</div>
	)
}
