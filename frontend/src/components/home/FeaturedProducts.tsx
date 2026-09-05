"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Star } from "lucide-react"
import { getProductImage } from "@/constants/productImages"
import { useStoreContext } from "@/lib/store-context"
import { getStoreRouteHref } from "@/lib/store-home"
import { getMerchantWhatsAppHref } from "@/lib/merchant-contact"
import ProductActions from "@/components/product/ProductActions"
import type { ProductRecommendation } from "backend/services/recommendation.service"

export default function FeaturedProducts({ products }: { products: ProductRecommendation[] }) {
	const store = useStoreContext()
	return (
		<section>
			<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-8">
				<h2 className="text-2xl sm:text-3xl font-bold">Featured Products</h2>
				<Link
					href={getStoreRouteHref(store, "/products")}
					className="text-primary hover:underline flex items-center gap-1"
				>
					View All <ArrowRight size={16} />
				</Link>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
				{products.length === 0 ? <p className="glass-card p-6 text-sm text-gray-500 sm:col-span-2 xl:col-span-4">No featured products yet. Products marked as featured by the merchant will appear here.</p> : products.map((product, i) => (
					<motion.div
						key={product.id}
						initial={{ opacity: 0, scale: 0.9 }}
						whileInView={{ opacity: 1, scale: 1 }}
						viewport={{ once: true }}
						transition={{ delay: i * 0.1 }}
					>
						<article className="glass-card navy-glass relative block overflow-hidden">
						<Link href={getStoreRouteHref(store, `/products/${product.slug}`)} className="group block pb-28">
							<div className="relative mb-4 aspect-[4/3] w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
								<Image
									src={getProductImage(product.images[0], product.name)}
									alt={product.name}
									fill
									className="object-contain transition-transform duration-500 lg:group-hover:scale-105"
								/>
							</div>
							<h3 className="font-semibold truncate">{product.name}</h3>
							<div className="flex items-center gap-1 mt-1">
								<Star size={14} className="text-yellow-500 fill-yellow-500" />
								<span className="text-sm">{product.rating}</span>
							</div>
							<div className="mt-2 flex items-baseline gap-2">
								{"discountedPrice" in product && product.discountedPrice ? (
									<>
										<span className="text-lg font-bold">
											KES {product.discountedPrice.toLocaleString()}
										</span>
										<span className="text-sm line-through text-gray-400">
											KES {product.price.toLocaleString()}
										</span>
									</>
								) : (
									<span className="text-lg font-bold">
										KES {product.price.toLocaleString()}
									</span>
								)}
							</div>
						</Link>
						<div className="absolute inset-x-3 bottom-3">
							<ProductActions productId={product.id} name={product.name} brand={product.brand} image={product.images[0]} price={product.discountedPrice ?? product.price} stock={product.stock} slug={product.slug} hasVariants={product.hasVariants} merchantHref={getMerchantWhatsAppHref({ number: store.contact.whatsappNumber, storeName: store.brand.name, items: [{ name: product.name, price: product.discountedPrice ?? product.price }] })} />
						</div>
						</article>
					</motion.div>
				))}
			</div>
		</section>
	)
}
