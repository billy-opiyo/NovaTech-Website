import InfoPage from "@/components/content/InfoPage"
import { getStoreContext } from "@/lib/store-context.server"


export default async function WarrantyPage() {
	const store = await getStoreContext()
	if (!store.isPlatformHome && store.industry?.slug === "cakes") {
		return <InfoPage title="Cake Orders & Quality" description={`Information about custom orders from ${store.brand.name}.`} sections={[
			{ title: "Custom order details", content: "Share the flavour, size, design, event date, and dietary requirements you have in mind. The store will confirm availability, ingredients, price, and preparation timing before your order is finalized." },
			{ title: "Questions about an order", content: "Contact the store directly as soon as possible if you have a question about an order, collection, delivery, or a product you received." },
			{ title: "Store policies", content: "Order changes, cancellations, and any remedy for a product issue are handled under the store's current policy. Ask the merchant to confirm the details before ordering." },
		]} />
	}
	if (!store.isPlatformHome && store.industry?.slug === "furniture") {
		return <InfoPage title="Furniture Product Care & Support" description={`Product information and support from ${store.brand.name}.`} sections={[
			{ title: "Check product details", content: "Review the listed dimensions, materials, finish, and care information. Contact the store to confirm measurements, assembly, delivery access, and any custom options before ordering." },
			{ title: "Care and after-sales support", content: "Care instructions and any applicable warranty or after-sales support depend on the item. Contact the merchant with your order details if you need assistance." },
			{ title: "Delivery and returns", content: "The store confirms delivery arrangements and handles returns or other order requests under its current policy. Please confirm those terms before purchasing." },
		]} />
	}
	if (!store.isPlatformHome && store.industry?.slug !== "electronics") {
		return <InfoPage title="Product Support" description={`Product and order support from ${store.brand.name}.`} sections={[
			{ title: "Product information", content: "Review the details shown on each product page and contact the store to confirm availability, options, and any questions before ordering." },
			{ title: "Order support", content: "The merchant handles order questions, delivery, returns, and applicable after-sales support. Contact the store with your order details if you need help." },
		]} />
	}
	return (
		<InfoPage
			title="Warranty"
			description="Know what is covered and how to get help when you need it."
			sections={[
				{
					title: "Official product coverage",
					content:
						"Warranty coverage is set by the independent merchant and/or manufacturer. Review the exact coverage on the product page and confirm it with the store before purchasing.",
				},
				{
					title: "Making a claim",
					content:
						"Contact the merchant that sold the product with your order details and a description of the issue. The merchant handles the warranty claim and manufacturer coordination.",
				},
				{
					title: "Keep your proof of purchase",
					content:
						"Keep the receipt or order confirmation provided by the merchant, as it may be needed to verify warranty eligibility.",
				},
			]}
		/>
	)
}
