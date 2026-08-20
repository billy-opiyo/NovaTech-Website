export type PublicPage = {
	text: string
	href: string
	description: string
	keywords: string
}

// Keep this index limited to customer-facing routes. Admin, API, and
// authenticated account routes must never appear in the public search UI.
export const publicPages: PublicPage[] = [
	{ text: "Home", href: "/", description: "Nurava Tech home page", keywords: "store electronics shop" },
	{ text: "All Products", href: "/products", description: "Browse phones, laptops, accessories, and more", keywords: "products catalog shop" },
	{ text: "Phones", href: "/category/phones", description: "Shop smartphones and mobile phones", keywords: "mobile smartphones iphone samsung" },
	{ text: "Laptops", href: "/category/laptops", description: "Shop laptops and computers", keywords: "computers macbook dell hp lenovo" },
	{ text: "Tablets", href: "/category/tablets", description: "Shop tablets and iPads", keywords: "ipad tablet" },
	{ text: "Accessories", href: "/category/accessories", description: "Shop chargers, cases, audio, and accessories", keywords: "chargers cables headphones cases" },
	{ text: "Deals", href: "/deals", description: "Today’s electronics deals and offers", keywords: "sale discounts offers" },
	{ text: "Compare Products", href: "/compare", description: "Compare products and specifications", keywords: "comparison specs" },
	{ text: "About Nurava Tech", href: "/about", description: "Learn about Nurava Tech", keywords: "company about us" },
	{ text: "Blog", href: "/blog", description: "Technology news, guides, and advice", keywords: "technology news guides" },
	{ text: "FAQs", href: "/faqs", description: "Frequently asked questions", keywords: "help questions answers" },
	{ text: "Warranty", href: "/warranty", description: "Nurava Tech product warranty information", keywords: "guarantee support" },
	{ text: "Contact Us", href: "/contact", description: "Contact Nurava Tech support", keywords: "support message phone email" },
	{ text: "Return Policy", href: "/return-policy", description: "Returns and refunds policy", keywords: "returns refunds exchange" },
	{ text: "Privacy Policy", href: "/privacy-policy", description: "How Nurava Tech handles your privacy", keywords: "privacy data" },
	{ text: "Cookie Policy", href: "/cookie-policy", description: "Cookies and browser storage information", keywords: "cookies storage" },
	{ text: "Terms and Conditions", href: "/terms", description: "Nurava Tech terms and conditions", keywords: "terms legal conditions" },
	{ text: "Sign In", href: "/auth/signin", description: "Sign in to your Nurava Tech account", keywords: "login account" },
	{ text: "Create an Account", href: "/auth/signup", description: "Create a Nurava Tech customer account", keywords: "register signup account" },
	{ text: "Forgot Password", href: "/auth/forgot-password", description: "Reset your account password", keywords: "password reset login" },
	{ text: "Verify Email", href: "/auth/verify-email", description: "Verify your Nurava Tech customer email", keywords: "email verification code" },
	{ text: "Reset Password", href: "/auth/reset-password", description: "Choose a new account password", keywords: "password reset" },
]
