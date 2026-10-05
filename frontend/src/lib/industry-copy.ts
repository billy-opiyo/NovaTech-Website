export function getProductSearchPlaceholder(industrySlug?: string | null) {
	switch (industrySlug) {
		case "electronics":
			return 'Search products... e.g., "i7 laptop 16GB RAM"'
		case "cakes":
			return "Search cakes, flavours, or occasions..."
		case "furniture":
			return "Search furniture, rooms, or materials..."
		default:
			return "Search products by name, category, or details..."
	}
}
