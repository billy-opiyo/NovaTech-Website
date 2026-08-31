import { Resend } from "resend"
import { PLATFORM_BRAND_NAME, PLATFORM_HELLO_EMAIL } from "./brand"
import { escapeHtml } from "./html"

const resend = process.env.RESEND_API_KEY
	? new Resend(process.env.RESEND_API_KEY)
	: null
const FROM_EMAIL = `${PLATFORM_BRAND_NAME} <${PLATFORM_HELLO_EMAIL}>`

interface EmailOptions {
	to: string
	subject: string
	html: string
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
	if (!resend) {
		console.warn("RESEND_API_KEY is not configured. Skipping email send.")
		return { id: null }
	}

	try {
		const data = await resend.emails.send({
			from: FROM_EMAIL,
			to,
			subject,
			html,
		})
		return data
	} catch (error) {
		console.error("Email send error:", error)
		throw error
	}
}

interface OrderConfirmationItem {
	quantity: number
	price: number
	product?: { name?: string | null } | null
}

interface OrderConfirmation {
	id: string
	total: number
	items: OrderConfirmationItem[]
	shippingAddress: unknown
}

export function shippingAddressEmail(address: unknown): string | undefined {
	if (!address || typeof address !== "object" || Array.isArray(address)) return undefined
	const value = (address as { email?: unknown }).email
	return typeof value === "string" && value.trim() ? value.trim() : undefined
}

export function emailWasAccepted(result: unknown) {
	if (!result || typeof result !== "object") return false
	if ("id" in result && typeof result.id === "string" && result.id.length > 0) return true
	if ("data" in result && result.data && typeof result.data === "object" && "id" in result.data) return typeof result.data.id === "string" && result.data.id.length > 0
	return false
}

export async function sendOrderConfirmationEmail(email: string, order: OrderConfirmation) {
	const address = order.shippingAddress && typeof order.shippingAddress === "object" && !Array.isArray(order.shippingAddress)
		? order.shippingAddress as Record<string, unknown>
		: {}
	const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background: linear-gradient(135deg, #0070f3, #f97316); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
<h1 style="color: white; margin: 0;">${escapeHtml(PLATFORM_BRAND_NAME)}</h1>
        <p style="color: rgba(255,255,255,0.9); margin-top: 8px;">Order Confirmation</p>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1f2937;">Thank you for your order!</h2>
        <p style="color: #6b7280;">Your order <strong>#${order.id.slice(-8).toUpperCase()}</strong> has been confirmed.</p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #1f2937; margin-top: 0;">Order Summary</h3>
          ${order.items
						.map(
							(item) => `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
							<span>${escapeHtml(item.product?.name || "Product")} x${escapeHtml(item.quantity)}</span>
              <span style="font-weight: 600;">KES ${(item.price * item.quantity).toLocaleString()}</span>
            </div>
          `,
						)
						.join("")}
          <div style="display: flex; justify-content: space-between; padding: 12px 0; font-weight: bold; font-size: 18px;">
            <span>Total</span>
            <span>KES ${order.total.toLocaleString()}</span>
          </div>
        </div>

        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #1f2937; margin-top: 0;">Delivery Address</h3>
		  <p style="color: #6b7280; margin: 4px 0;">${escapeHtml(address.fullName)}</p>
		  <p style="color: #6b7280; margin: 4px 0;">${escapeHtml(address.phone)}</p>
		  <p style="color: #6b7280; margin: 4px 0;">${escapeHtml(address.address)}, ${escapeHtml(address.town)}</p>
		  <p style="color: #6b7280; margin: 4px 0;">${escapeHtml(address.county)}</p>
        </div>

        <a href="${process.env.NEXT_PUBLIC_APP_URL}/account/orders/${order.id}" 
           style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Track Your Order
        </a>
      </div>
    </div>
  `

	return sendEmail({
		to: email,
		subject: `Order Confirmed #${order.id.slice(-8).toUpperCase()}`,
		html,
	})
}
