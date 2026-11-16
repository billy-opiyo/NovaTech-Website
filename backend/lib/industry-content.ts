export const INDUSTRY_UNSPLASH_IMAGES = {
	retailCategory: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1000&q=80",
	furnitureBed: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=80",
	furnitureSofa: "https://images.unsplash.com/photo-1709746837880-f96b4f588ce5?auto=format&fit=crop&w=1000&q=80",
	furnitureDining: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=80",
	cakeBirthday: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1000&q=80",
	cakeWedding: "https://images.unsplash.com/photo-1676734626918-b0663902259f?auto=format&fit=crop&w=1000&q=80",
	cakeCupcakes: "https://images.unsplash.com/photo-1486427944299-d1955d23e34d?auto=format&fit=crop&w=1000&q=80",
	electronicsCategory: "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1000&q=80",
} as const

type IndustryIdentity = { name: string; slug: string }

const PLATFORM_CATEGORY_CARD_IMAGES: Record<string, Record<string, { src: string; defaultUnsplashPath?: string }>> = {
	electronics: {
		phones: { src: "/images/category-cards/phone.png", defaultUnsplashPath: "/photo-1498049794561-7780e7231661" },
		laptops: { src: "/images/category-cards/laptop.png", defaultUnsplashPath: "/photo-1498049794561-7780e7231661" },
		tablets: { src: "/images/category-cards/tablet.png", defaultUnsplashPath: "/photo-1498049794561-7780e7231661" },
		accessories: { src: "/images/category-cards/accessories.png", defaultUnsplashPath: "/photo-1498049794561-7780e7231661" },
	},
	cakes: {
		"birthday-cakes": { src: "/images/category-cards/birthday_cakes.png", defaultUnsplashPath: "/photo-1578985545062-69928b1d9587" },
		"wedding-cakes": { src: "/images/category-cards/wedding_cakes.png", defaultUnsplashPath: "/photo-1519655272701-6c23d7e9ad40" },
		cupcakes: { src: "/images/category-cards/cup_cakes.png", defaultUnsplashPath: "/photo-1486427944299-d1955d23e34d" },
	},
	furniture: {
		beds: { src: "/images/category-cards/beds.png", defaultUnsplashPath: "/photo-1505693416388-ac5ce068fe85" },
		sofas: { src: "/images/category-cards/sofas.png", defaultUnsplashPath: "/photo-1709746837880-f96b4f588ce5" },
		"dining-tables": { src: "/images/category-cards/dining.png", defaultUnsplashPath: "/photo-1600210492486-724fe5c67fb0" },
	},
	boutiques: {
		"mens-clothing": { src: "/images/category-cards/men_clothing.png", defaultUnsplashPath: "/photo-1521572163474-6864f9cf17ab" },
		"womens-clothing": { src: "/images/category-cards/women_clothing.png", defaultUnsplashPath: "/photo-1483985988355-763728e1935b" },
		"childrens-clothing": { src: "/images/category-cards/children_clothing.png", defaultUnsplashPath: "/photo-1519238263530-99bdd11df2ea" },
		"mens-shoes": { src: "/images/category-cards/men_shoes.png", defaultUnsplashPath: "/photo-1542291026-7eec264c27ff" },
		"womens-shoes": { src: "/images/category-cards/women_shoes.png", defaultUnsplashPath: "/photo-1543163521-1bf539c55dd2" },
		"childrens-shoes": { src: "/images/category-cards/children_shoes.png", defaultUnsplashPath: "/photo-1514989940723-e8e51635b782" },
	},
}

const objectValue = (value: unknown): Record<string, unknown> =>
	value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}

export function defaultIndustryHomepage(industry: IndustryIdentity, storedPreset?: unknown): Record<string, unknown> {
	const slug = industry.slug.toLowerCase()
	const label = industry.name.trim() || "Independent Store"
	const knownDefaults: Record<string, Record<string, unknown>> = {
		electronics: {
			heroTitle: "Upgrade Your Tech",
			heroHighlight: "With Genuine Deals",
			heroDescription: "Explore trusted devices and useful technology, selected by your store for work, play, and everything in between.",
			heroPrimaryLabel: "Browse Products",
			heroPrimaryHref: "/products",
			heroSecondaryLabel: "Explore Categories",
			heroSecondaryHref: "/products",
			categoryTitle: "Shop by Category",
			featuredTitle: "Featured Technology",
		},
		furniture: {
			heroTitle: "Make Room for Better Living",
			heroHighlight: "Made for Your Home",
			heroDescription: "Settle into thoughtful furniture, warm natural finishes, and lasting pieces for every corner of home.",
			heroPrimaryLabel: "Find Your Room",
			heroPrimaryHref: "/products",
			heroSecondaryLabel: "Explore Furniture",
			heroSecondaryHref: "/products",
			categoryTitle: "Find Your Room",
			featuredTitle: "Furniture to Live With",
		},
		cakes: {
			heroTitle: "Make Every Gathering Sweeter",
			heroHighlight: "Baked for Your Moments",
			heroDescription: "Choose a beautiful centrepiece, your favourite flavour, and the finishing touches. We bake celebration cakes to order and deliver the joy to your door.",
			heroPrimaryLabel: "Choose Your Cake",
			heroPrimaryHref: "/products",
			heroSecondaryLabel: "Explore Occasions",
			heroSecondaryHref: "/products",
			categoryTitle: "Something for Every Celebration",
			featuredTitle: "Fresh from the Cake Studio",
		},
	}
	const genericDefaults: Record<string, unknown> = {
		heroTitle: `Discover ${label}`,
		heroHighlight: "Picked for You",
		heroDescription: `Explore a thoughtful collection of ${label.toLowerCase()} products, with helpful service and delivery arranged by your independent store.`,
		heroPrimaryLabel: `Shop ${label}`,
		heroPrimaryHref: "/products",
		heroSecondaryLabel: "Browse Categories",
		heroSecondaryHref: "/products",
		categoryTitle: `Shop ${label}`,
		featuredTitle: `Featured ${label}`,
	}
	const preset = { ...objectValue(storedPreset) }
	delete preset.heroImage
	delete preset.heroImageAlt
	return { ...(knownDefaults[slug] || genericDefaults), ...preset }
}

export function defaultCategoryImage(industrySlug: string, categoryName: string, imageUrl?: string | null): string {
	if (imageUrl) {
		try {
			const parsedImageUrl = new URL(imageUrl)
			const isBrokenWeddingCakeImage = parsedImageUrl.hostname === "images.unsplash.com"
				&& parsedImageUrl.pathname === "/photo-1519655272701-6c23d7e9ad40"
			if (isBrokenWeddingCakeImage) return INDUSTRY_UNSPLASH_IMAGES.cakeWedding
			if (parsedImageUrl.protocol === "https:") return imageUrl
		} catch {
			// Use an industry-safe default if a malformed image value was stored.
		}
	}
	const industry = industrySlug.toLowerCase()
	const category = categoryName.toLowerCase()
	if (industry.includes("cake") || industry.includes("bakery") || /cake|cupcake|dessert|pastry|bakery/.test(category)) {
		if (/cupcake/.test(category)) return INDUSTRY_UNSPLASH_IMAGES.cakeCupcakes
		if (/wedding/.test(category)) return INDUSTRY_UNSPLASH_IMAGES.cakeWedding
		return INDUSTRY_UNSPLASH_IMAGES.cakeBirthday
	}
	if (industry.includes("furniture") || /sofa|bed|table|chair|furniture|living|room/.test(category)) {
		if (/bed/.test(category)) return INDUSTRY_UNSPLASH_IMAGES.furnitureBed
		if (/dining|table/.test(category)) return INDUSTRY_UNSPLASH_IMAGES.furnitureDining
		return INDUSTRY_UNSPLASH_IMAGES.furnitureSofa
	}
	if (industry.includes("electronic") || /phone|laptop|tablet|camera|computer|gaming/.test(category)) return INDUSTRY_UNSPLASH_IMAGES.electronicsCategory
	return INDUSTRY_UNSPLASH_IMAGES.retailCategory
}

/** Resolve built-in platform-store card art while leaving administrator uploads intact. */
export function platformStoreCategoryImage(industrySlug: string, categorySlug: string, categoryName: string, imageUrl?: string | null): string {
	const image = PLATFORM_CATEGORY_CARD_IMAGES[industrySlug.toLowerCase()]?.[categorySlug.toLowerCase()]
	if (!image) return defaultCategoryImage(industrySlug, categoryName, imageUrl)
	if (!imageUrl || imageUrl === image.src) return image.src
	try {
		const parsed = new URL(imageUrl)
		if (parsed.hostname === "images.unsplash.com" && parsed.pathname === image.defaultUnsplashPath) return image.src
	} catch {
		// Preserve the existing safe fallback for malformed values.
	}
	return defaultCategoryImage(industrySlug, categoryName, imageUrl)
}
