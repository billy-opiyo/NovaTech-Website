"use client"

import HeroBanner from "@/components/home/HeroBanner"
import CategoryGrid from "@/components/home/CategoryGrid"
import FeaturedProducts from "@/components/home/FeaturedProducts"
import Testimonials from "@/components/home/Testimonials"
import Newsletter from "@/components/home/Newsletter"
import { Mail, Phone, MapPin, Send } from "lucide-react"
import Link from "next/link"
import { useStoreContext } from "@/lib/store-context"

export default function MerchantHomePage() {
	const store = useStoreContext()
	return (
		<div className="space-y-24">
			<HeroBanner />
			<CategoryGrid />
			<FeaturedProducts />
			<Testimonials />
			{store.features.showNewsletter && <Newsletter />}
			<div className="mb-16 space-y-8">
				<div className="glass-card p-8 md:p-12">
					<div className="grid gap-8 md:grid-cols-2">
						<div>
							<h2 className="mb-6 text-2xl font-bold">Get in Touch</h2>
							<div className="mb-8 space-y-4">
								<div className="flex items-start gap-3"><Phone className="mt-1 text-primary" size={20} /><div><p className="font-medium">Call Us</p><p className="text-gray-600">{store.contact.businessHours}</p><a href={store.contact.phoneHref} className="text-primary transition-colors hover:underline">{store.contact.phoneDisplay}</a></div></div>
								<div className="flex items-start gap-3"><Mail className="mt-1 text-primary" size={20} /><div><p className="font-medium">Email Us</p><p className="text-gray-600">{store.contact.responseTime}</p><a href={store.contact.emailHref} className="text-primary transition-colors hover:underline">{store.contact.email}</a></div></div>
							</div>
							<div><h3 className="mb-3 font-semibold">Location</h3><div className="flex items-start gap-3"><MapPin className="mt-1 text-primary" size={20} /><div><p className="font-medium">Visit Our Store</p><p className="text-gray-600">{store.contact.addressLine}</p><p className="text-primary">{store.contact.cityCountry}</p></div></div></div>
							<div className="mt-6"><h3 className="mb-3 font-semibold">Quick Links</h3><div className="flex flex-col gap-3"><Link href="/contact" className="text-primary transition-colors hover:underline">Contact Form</Link><Link href="/products?category=phones" className="text-primary transition-colors hover:underline">View Products</Link></div></div>
						</div>
						<div className="space-y-6"><h2 className="text-2xl font-bold">Send Us a Message</h2><Link href="/contact" className="btn-primary flex w-full items-center justify-center gap-2 py-3"><Send size={18} /> Message Us</Link></div>
					</div>
				</div>

				<div className="glass-card overflow-hidden p-0">
					<div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between md:p-8"><div className="flex items-start gap-3"><MapPin className="mt-1 shrink-0 text-primary" size={22} /><div><h2 className="text-2xl font-bold">Visit Us</h2><p className="mt-1 text-gray-600">{store.contact.addressLine}</p><p className="text-primary">{store.contact.cityCountry}</p></div></div><a href={store.contact.mapLink} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open in Google Maps</a></div>
					<div className="home-map-viewport h-72 w-full sm:h-80"><iframe src={store.contact.mapEmbedUrl} title={`${store.brand.name} location on Google Maps`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="home-map-frame h-full w-full border-0" /></div>
				</div>
			</div>
		</div>
	)
}
