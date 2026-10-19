export type PublicPage = {
	text: string
	href: string
	description: string
	keywords: string
}

// Keep this index limited to customer-facing routes. Admin, API, and
// authenticated account routes must never appear in the public search UI.
export const publicPages: PublicPage[] = [
	{ text: "Home", href: "/", description: "Nurava HubStores multi-industry platform", keywords: "store platform commerce shop" },
	{ text: "All Products", href: "/products", description: "Browse products available from this store", keywords: "products catalog shop" },
	{ text: "Deals", href: "/deals", description: "Current offers from this store", keywords: "sale discounts offers" },
	{ text: "Compare Products", href: "/compare", description: "Compare products and specifications", keywords: "comparison specs" },
	{ text: "About Nurava HubStores", href: "/about", description: "Learn about Nurava HubStores", keywords: "company about us" },
	{ text: "Blog", href: "/blog", description: "Business and commerce news, guides, and updates", keywords: "business commerce news guides" },
	{ text: "FAQs", href: "/faqs", description: "Frequently asked questions", keywords: "help questions answers" },
	{ text: "Warranty", href: "/warranty", description: "Information about store-provided product warranties", keywords: "guarantee support" },
	{ text: "Contact Us", href: "/contact", description: "Contact Nurava HubStores support", keywords: "support message phone email" },
	{ text: "Return Policy", href: "/return-policy", description: "Returns and refunds policy", keywords: "returns refunds exchange" },
	{ text: "Privacy Policy", href: "/privacy-policy", description: "How Nurava HubStores handles your privacy", keywords: "privacy data" },
	{ text: "Cookie Policy", href: "/cookie-policy", description: "Cookies and browser storage information", keywords: "cookies storage" },
	{ text: "Terms and Conditions", href: "/terms", description: "Nurava HubStores terms and conditions", keywords: "terms legal conditions" },
	{ text: "Sign In", href: "/auth/signin", description: "Sign in to your Nurava HubStores account", keywords: "login account" },
	{ text: "Create an Account", href: "/auth/signup", description: "Create a Nurava HubStores customer account", keywords: "register signup account" },
	{ text: "Forgot Password", href: "/auth/forgot-password", description: "Reset your account password", keywords: "password reset login" },
	{ text: "Verify Email", href: "/auth/verify-email", description: "Verify your Nurava HubStores customer email", keywords: "email verification code" },
	{ text: "Reset Password", href: "/auth/reset-password", description: "Choose a new account password", keywords: "password reset" },
]
