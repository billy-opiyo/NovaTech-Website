// Application-wide constants
// Keep this relative import compatible with the repository's plain Node test loader.
import { clientConfig } from "../config/client.config"

export const APP_NAME = clientConfig.brand.shortName
export const APP_URL = clientConfig.site.url

// Free shipping threshold (KES)
export const FREE_SHIPPING_THRESHOLD = clientConfig.ecommerce.freeShippingThreshold
export const DEFAULT_SHIPPING_COST = clientConfig.ecommerce.defaultShippingCost

// Order statuses
export const ORDER_STATUSES = [
	"PENDING",
	"CONFIRMED",
	"PROCESSING",
	"SHIPPED",
	"OUT_FOR_DELIVERY",
	"DELIVERED",
	"CANCELLED",
] as const

export const ORDER_STATUS_LABELS: Record<string, string> = {
	PENDING: "Pending",
	CONFIRMED: "Confirmed",
	PROCESSING: "Processing",
	SHIPPED: "Shipped",
	OUT_FOR_DELIVERY: "Out for Delivery",
	DELIVERED: "Delivered",
	CANCELLED: "Cancelled",
}

// Payment methods
export const PAYMENT_METHODS = ["mpesa", "card", "cod"] as const

// Support ticket categories
export const TICKET_CATEGORIES = [
	"technical",
	"billing",
	"shipping",
	"product",
	"other",
] as const

export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const

export const TICKET_STATUSES = [
	"open",
	"in_progress",
	"waiting_customer",
	"resolved",
	"closed",
] as const

// Delivery regions (Kenya counties)
export const DELIVERY_REGIONS = [
	"Nairobi",
	"Mombasa",
	"Kisumu",
	"Nakuru",
	"Eldoret",
	"Thika",
	"Machakos",
	"Kiambu",
	"Kajiado",
	"Other",
] as const

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20
export const DEFAULT_PRODUCT_PAGE_SIZE = 12

// Inventory thresholds
export const LOW_STOCK_THRESHOLD = 10
export const REORDER_DAYS = 30

// Analytics time ranges
export const ANALYTICS_TIME_RANGES = ["7d", "30d", "3m", "1y"] as const

// API route paths
export const API_ROUTES = {
	products: "/api/products",
	orders: "/api/orders",
	reviews: "/api/reviews",
	wishlist: "/api/wishlist",
	cart: "/api/cart",
	support: "/api/support/tickets",
	contact: "/api/contact",
	newsletter: "/api/newsletter",
	analytics: "/api/analytics",
	inventory: "/api/inventory",
	adminLogs: "/api/admin/logs",
} as const

// App route paths
export const ROUTES = {
	home: "/",
	products: "/products",
	cart: "/cart",
	checkout: "/checkout",
	account: "/account",
	orders: "/account/orders",
	admin: "/admin",
	adminDashboard: "/admin/dashboard",
	adminOrders: "/admin/orders",
	adminProducts: "/admin/products",
	adminInventory: "/admin/inventory",
	adminAnalytics: "/admin/analytics",
	adminActivity: "/admin/activity",
	adminSupport: "/admin/support",
	contact: "/contact",
	deals: "/deals",
	compare: "/compare",
} as const
