"use client"

import HeroBanner from "@/components/home/HeroBanner"
import CategoryGrid from "@/components/home/CategoryGrid"
import FeaturedProducts from "@/components/home/FeaturedProducts"
import Testimonials from "@/components/home/Testimonials"
import Newsletter from "@/components/home/Newsletter"
import { Mail, Phone, MapPin, Send } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
	return (
		<div className="space-y-24">
			<HeroBanner />
			<CategoryGrid />
			<FeaturedProducts />
			<Testimonials />
			<Newsletter />
			<div className="glass-card p-8 md:p-12 mb-16">
				<div className="grid md:grid-cols-2 gap-8">
					<div>
						<h2 className="text-2xl font-bold mb-6">Get in Touch</h2>
						<div className="space-y-4 mb-8">
							<div className="flex items-start gap-3">
								<Phone className="mt-1 text-primary" size={20} />
								<div>
									<p className="font-medium">Call Us</p>
									<p className="text-gray-600">Mon - Sat, 8AM - 6PM</p>
									<a
										href="tel:+254700123456"
										className="text-primary hover:underline transition-colors"
									>
										+254 700 123 456
									</a>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<Mail className="mt-1 text-primary" size={20} />
								<div>
									<p className="font-medium">Email Us</p>
									<p className="text-gray-600">We reply within 24 hours</p>
									<a
										href="mailto:support@novatechstore.co.ke"
										className="text-primary hover:underline transition-colors"
									>
										support@novatechstore.co.ke
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
									<p className="text-gray-600">Kimathi Street, CBD</p>
									<p className="text-primary">Nairobi, Kenya</p>
								</div>
							</div>
						</div>

						<div>
							<h3 className="font-semibold mb-3">Quick Links</h3>
							<div className="space-y-4">
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
		</div>
	)
}
