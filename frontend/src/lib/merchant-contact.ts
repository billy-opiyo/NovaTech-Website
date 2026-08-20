export type MerchantInquiryItem = {
	name: string
	quantity?: number
	variant?: string
	price?: number
}

function normalizeWhatsAppNumber(value: string) {
	return value.replace(/\D/g, "")
}

export function getMerchantWhatsAppHref(input: {
	number: string
	storeName: string
	items: MerchantInquiryItem[]
}) {
	const itemLines = input.items.map((item) => {
		const quantity = item.quantity && item.quantity > 1 ? ` x${item.quantity}` : ""
		const variant = item.variant ? ` (${item.variant})` : ""
		const price = typeof item.price === "number" ? ` - KES ${item.price.toLocaleString()}` : ""
		return `- ${item.name}${variant}${quantity}${price}`
	}).join("\n")
	const text = `Hello ${input.storeName}, I found these products on Nurava Tech and would like to enquire about availability, delivery, warranty, and payment:\n${itemLines}`
	return `https://wa.me/${normalizeWhatsAppNumber(input.number)}?text=${encodeURIComponent(text)}`
}

export function getMerchantEmailHref(email: string, storeName: string, items: MerchantInquiryItem[]) {
	const itemLines = items.map((item) => `${item.name}${item.variant ? ` (${item.variant})` : ""}${item.quantity && item.quantity > 1 ? ` x${item.quantity}` : ""}`).join(", ")
	return `mailto:${email}?subject=${encodeURIComponent(`Product enquiry for ${storeName}`)}&body=${encodeURIComponent(`Hello ${storeName},\n\nI would like to enquire about: ${itemLines}.\n\nPlease confirm availability, delivery, warranty, and payment details.`)}`
}
