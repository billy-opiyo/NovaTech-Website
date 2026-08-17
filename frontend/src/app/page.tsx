"use client"

import HeroBanner from "@/components/home/HeroBanner"
import CategoryGrid from "@/components/home/CategoryGrid"
import FeaturedProducts from "@/components/home/FeaturedProducts"
import Testimonials from "@/components/home/Testimonials"
import Newsletter from "@/components/home/Newsletter"
import { Mail, Phone, MapPin, Send } from "lucide-react"
import Link from "next/link"
import { clientConfig } from "@/config/client.config"

const mapEmbedUrl =
	"https://www.google.com/maps?q=Kimathi+Street,+CBD,+Nairobi,+Kenya&output=embed"
const mapLink =
	"https://www.google.com/maps/search/?api=1&query=Kimathi+Street,+CBD,+Nairobi,+Kenya"

export default function HomePage() {
	return (
		<div className="space-y-24">
			<HeroBanner />
			<CategoryGrid />
			<FeaturedProducts />
			<Testimonials />
			{clientConfig.features.showNewsletter && <Newsletter />}
			<div className="space-y-8 mb-16">
			<div className="glass-card p-8 md:p-12">
				<div className="grid md:grid-cols-2 gap-8">
					<div>
						<h2 className="text-2xl font-bold mb-6">Get in Touch</h2>
						<div className="space-y-4 mb-8">
							<div className="flex items-start gap-3">
								<Phone className="mt-1 text-primary" size={20} />
								<div>
									<p className="font-medium">Call Us</p>
										<p className="text-gray-600">{clientConfig.contact.businessHours}</p>
										<a
											href={clientConfig.contact.phoneHref}
										className="text-primary hover:underline transition-colors"
									>
											{clientConfig.contact.phoneDisplay}
									</a>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<Mail className="mt-1 text-primary" size={20} />
								<div>
									<p className="font-medium">Email Us</p>
										<p className="text-gray-600">{clientConfig.contact.responseTime}</p>
										<a
											href={clientConfig.contact.emailHref}
										className="text-primary hover:underline transition-colors"
									>
											{clientConfig.contact.email}
									</a>
								</div>
							</div>
						</div>

						<div>
							<h3 className="font-semibold mb-3">Location</h3>
							<div className="flex items-start gap-3">
								<MapPin className="mt-1 text-primary" size={20} />
								<div>
									<p className="font-medium">Visit Our Store</p>
									<p className="text-gray-600">{clientConfig.contact.addressLine}</p>
									<p className="text-primary">{clientConfig.contact.cityCountry}</p>
								</div>
							</div>
						</div>

						<div>
							<h3 className="font-semibold mb-3">Quick Links</h3>
							<div className="flex flex-col gap-3">
								<Link
									href="/contact"
									className="text-primary hover:underline transition-colors"
								>
									Contact Form
								</Link>
								<Link
									href="/products?category=phones"
									className="text-primary hover:underline transition-colors"
								>
									View Products
								</Link>
							</div>
						</div>
					</div>

					<div className="space-y-6">
						<h2 className="text-2xl font-bold">Send Us a Message</h2>
						<Link
							href="/contact"
							className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50"
						>
							<Send size={18} /> Message Us
						</Link>
					</div>
				</div>
			</div>

			<div className="glass-card overflow-hidden p-0">
				<div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between md:p-8">
					<div className="flex items-start gap-3">
						<MapPin className="mt-1 shrink-0 text-primary" size={22} />
						<div>
							<h2 className="text-2xl font-bold">Visit Us</h2>
							<p className="mt-1 text-gray-600">{clientConfig.contact.addressLine}</p>
							<p className="text-primary">{clientConfig.contact.cityCountry}</p>
						</div>
					</div>
					<a
						href={mapLink}
						target="_blank"
						rel="noreferrer"
						className="text-primary hover:underline"
					>
						Open in Google Maps
					</a>
				</div>
				<div className="home-map-viewport h-72 w-full sm:h-80">
					<iframe
						src={mapEmbedUrl}
						title="NovaTech Store location on Google Maps"
						loading="lazy"
						referrerPolicy="no-referrer-when-downgrade"
						className="home-map-frame h-full w-full border-0"
					/>
				</div>
			</div>
			</div>
		</div>
	)
}
