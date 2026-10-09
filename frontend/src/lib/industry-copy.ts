export function getProductSearchPlaceholder(industrySlug?: string | null) {
	switch (industrySlug) {
		case "electronics":
			return 'Search products... e.g., "i7 laptop 16GB RAM"'
		case "cakes":
			return "Search cakes, flavours, or occasions..."
		case "furniture":
			return "Search furniture, rooms, or materials..."
		case "boutiques":
			return "Search clothing, shoes, sizes, or colours..."
		default:
			return "Search products by name, category, or details..."
	}
}

export function getProductEnquiryTopics(industrySlug?: string | null) {
	switch (industrySlug) {
		case "electronics":
			return "availability, specifications, compatibility, warranty, delivery, and payment"
		case "cakes":
			return "flavours, servings, design options, preparation timing, collection or delivery, and payment"
		case "furniture":
			return "materials, dimensions, finishes, availability, delivery, assembly, and payment"
		case "boutiques":
			return "sizes, fit, colours, materials, availability, delivery, and payment"
		default:
			return "availability, product details, delivery, and payment"
	}
}

export function getProductSupportDescription(industrySlug?: string | null) {
	switch (industrySlug) {
		case "electronics":
			return "The store confirms product availability, delivery, payment, returns, and any applicable warranty directly with shoppers."
		case "cakes":
			return "The baker confirms flavours, design details, preparation timing, collection or delivery, and payment directly with shoppers."
		case "furniture":
			return "The store confirms materials, dimensions, finishes, delivery, assembly, and payment directly with shoppers."
		case "boutiques":
			return "The store confirms sizing, fit, colours, materials, delivery, and payment directly with shoppers."
		default:
			return "The store confirms product details, availability, delivery, and payment directly with shoppers."
	}
}
