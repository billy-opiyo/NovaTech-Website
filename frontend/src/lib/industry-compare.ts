export function getStoreCompareStorageKey(storeId: string): string {
	return `compare:${storeId}`
}

export function getIndustryComparisonFields(industrySlug?: string | null) {
	switch (industrySlug) {
		case "cakes":
			return ["Flavor", "Weight", "Layers", "Servings", "Dietary details"]
		case "furniture":
			return ["Material", "Width", "Height", "Depth", "Color", "Finish"]
		case "boutiques":
			return ["For", "Available clothing sizes", "Available shoe sizes", "Color", "Material"]
		case "electronics":
			return ["Processor", "RAM", "Storage", "Display", "Battery", "Camera", "OS", "Weight", "GPU", "Ports"]
		default:
			return ["Brand", "Category", "Availability"]
	}
}
