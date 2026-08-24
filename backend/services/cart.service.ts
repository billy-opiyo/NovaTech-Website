import prisma from "../lib/db"
import { resolveVariantSelection } from "../lib/product-variant"

const FREE_SHIPPING_THRESHOLD = 50000
const DEFAULT_SHIPPING_COST = 500

function toCartResponse(items: any[], commerceSettings?: unknown) {
	const mappedItems = items.map((item) => {
		const selectedVariant = resolveVariantSelection(item.product.variants || [], item.variant)
		return {
		id: item.id,
		productId: item.productId,
		name: item.product.name,
		brand: item.product.brand,
		image: item.product.images[0] || "/placeholder-product.jpg",
		price: (item.product.discountedPrice ?? item.product.price) + selectedVariant.priceModifier,
		quantity: item.quantity,
		variant: item.variant || undefined,
		maxStock: selectedVariant.stock ?? item.product.stock,
		slug: item.product.slug,
		}
	})

	const subtotal = mappedItems.reduce(
		(sum, item) => sum + item.price * item.quantity,
		0,
	)
	const settings = commerceSettings && typeof commerceSettings === "object" && !Array.isArray(commerceSettings) ? commerceSettings as Record<string, unknown> : {}
	const freeShippingThreshold = typeof settings.freeShippingThreshold === "number" && Number.isFinite(settings.freeShippingThreshold) ? Math.max(0, settings.freeShippingThreshold) : FREE_SHIPPING_THRESHOLD
	const defaultShippingCost = typeof settings.defaultShippingCost === "number" && Number.isFinite(settings.defaultShippingCost) ? Math.max(0, settings.defaultShippingCost) : DEFAULT_SHIPPING_COST
	const shippingEstimate = subtotal >= freeShippingThreshold ? 0 : defaultShippingCost

	return {
		items: mappedItems,
		subtotal,
		shippingEstimate,
		total: subtotal + shippingEstimate,
	}
}

async function findCartItems(userId: string, tenantId: string) {
	return prisma.cartItem.findMany({
		where: { userId, tenantId },
		include: { product: { include: { variants: true } } },
		orderBy: { createdAt: "asc" },
	})
}

async function getCommerceSettings(tenantId: string) {
	const store = await prisma.store.findFirst({ where: { tenantId }, select: { commerceSettings: true } })
	return store?.commerceSettings
}

export async function getCart(userId: string, tenantId: string) {
	const [items, commerceSettings] = await Promise.all([findCartItems(userId, tenantId), getCommerceSettings(tenantId)])
	return toCartResponse(items, commerceSettings)
}

export async function addCartItem(
	userId: string,
	productId: string,
	quantity: number,
	tenantId: string,
	variant?: string,
) {
	const product = await prisma.product.findFirst({ where: { id: productId, tenantId }, include: { variants: true } })
	if (!product) throw new Error("Product not found")
	const selectedVariant = resolveVariantSelection(product.variants, variant)
	if (!selectedVariant.valid) throw new Error("The selected product variant is unavailable")
	const maxStock = selectedVariant.stock ?? product.stock
	if (quantity < 1 || quantity > maxStock) throw new Error("Requested quantity is unavailable")

	const existing = await prisma.cartItem.findFirst({
		where: { userId, tenantId, productId, variant: variant || null },
	})
	const nextQuantity = (existing?.quantity || 0) + quantity
	if (nextQuantity > maxStock) throw new Error("Requested quantity exceeds available stock")

	if (existing) {
		await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQuantity } })
	} else {
		await prisma.cartItem.create({ data: { userId, tenantId, productId, quantity, variant } })
	}

	return getCart(userId, tenantId)
}

export async function updateCartItem(userId: string, itemId: string, quantity: number, tenantId: string) {
	if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Quantity must be at least one")
	const item = await prisma.cartItem.findFirst({ where: { id: itemId, userId, tenantId }, include: { product: { include: { variants: true } } } })
	if (!item) throw new Error("Cart item not found")
	const selectedVariant = resolveVariantSelection(item.product.variants, item.variant)
	if (!selectedVariant.valid || quantity > (selectedVariant.stock ?? item.product.stock)) throw new Error("Requested quantity exceeds available stock")
	await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } })
	return getCart(userId, tenantId)
}

export async function removeCartItem(userId: string, itemId: string, tenantId: string) {
	await prisma.cartItem.deleteMany({ where: { id: itemId, userId, tenantId } })
	return getCart(userId, tenantId)
}

export async function clearCart(userId: string, tenantId: string) {
	await prisma.cartItem.deleteMany({ where: { userId, tenantId } })
	return getCart(userId, tenantId)
}
