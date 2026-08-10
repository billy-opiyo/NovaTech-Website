import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM_EMAIL = "ElectroBuy <orders@electrobuy.co.ke>"

interface EmailOptions {
	to: string
	subject: string
	html: string
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
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

export async function sendOrderConfirmationEmail(email: string, order: any) {
	const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background: linear-gradient(135deg, #0070f3, #f97316); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0;">ElectroBuy</h1>
        <p style="color: rgba(255,255,255,0.9); margin-top: 8px;">Order Confirmation</p>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1f2937;">Thank you for your order!</h2>
        <p style="color: #6b7280;">Your order <strong>#${order.id.slice(-8).toUpperCase()}</strong> has been confirmed.</p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #1f2937; margin-top: 0;">Order Summary</h3>
          ${order.items
						.map(
							(item: any) => `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
              <span>${item.product.name} x${item.quantity}</span>
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
          <p style="color: #6b7280; margin: 4px 0;">${order.shippingAddress.fullName}</p>
          <p style="color: #6b7280; margin: 4px 0;">${order.shippingAddress.phone}</p>
          <p style="color: #6b7280; margin: 4px 0;">${order.shippingAddress.address}, ${order.shippingAddress.town}</p>
          <p style="color: #6b7280; margin: 4px 0;">${order.shippingAddress.county}</p>
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
