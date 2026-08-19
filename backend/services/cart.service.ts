import prisma from "../lib/db"

const FREE_SHIPPING_THRESHOLD = 50000
const DEFAULT_SHIPPING_COST = 500

function toCartResponse(items: any[]) {
	const mappedItems = items.map((item) => ({
		id: item.id,
		productId: item.productId,
		name: item.product.name,
		brand: item.product.brand,
		image: item.product.images[0] || "/placeholder-product.jpg",
		price: item.product.discountedPrice ?? item.product.price,
		quantity: item.quantity,
		variant: item.variant || undefined,
		maxStock: item.product.stock,
		slug: item.product.slug,
	}))

	const subtotal = mappedItems.reduce(
		(sum, item) => sum + item.price * item.quantity,
		0,
	)
	const shippingEstimate = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_COST

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
		include: { product: true },
		orderBy: { createdAt: "asc" },
	})
}

export async function getCart(userId: string, tenantId: string) {
	return toCartResponse(await findCartItems(userId, tenantId))
}

export async function addCartItem(
	userId: string,
	productId: string,
	quantity: number,
	tenantId: string,
	variant?: string,
) {
	const product = await prisma.product.findFirst({ where: { id: productId, tenantId } })
	if (!product) throw new Error("Product not found")
	if (quantity < 1 || quantity > product.stock) throw new Error("Requested quantity is unavailable")

	const existing = await prisma.cartItem.findFirst({
		where: { userId, tenantId, productId, variant: variant || null },
	})
	const nextQuantity = (existing?.quantity || 0) + quantity
	if (nextQuantity > product.stock) throw new Error("Requested quantity exceeds available stock")

	if (existing) {
		await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQuantity } })
	} else {
		await prisma.cartItem.create({ data: { userId, tenantId, productId, quantity, variant } })
	}

	return getCart(userId, tenantId)
}

export async function updateCartItem(userId: string, itemId: string, quantity: number, tenantId: string) {
	if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Quantity must be at least one")
	const item = await prisma.cartItem.findFirst({ where: { id: itemId, userId, tenantId }, include: { product: true } })
	if (!item) throw new Error("Cart item not found")
	if (quantity > item.product.stock) throw new Error("Requested quantity exceeds available stock")
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
