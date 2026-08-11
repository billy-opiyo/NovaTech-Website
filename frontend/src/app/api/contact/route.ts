import { NextRequest, NextResponse } from "next/server"
import { rateLimiter } from "backend/middleware/rateLimiter"
import { z } from "zod"
import { createTicket } from "backend/services/support.service"
import { sendEmail } from "backend/lib/email"

const contactSchema = z.object({
	name: z.string().min(2),
	email: z.string().email(),
	phone: z.string().optional(),
	subject: z.string().min(3),
	message: z.string().min(10),
	orderNumber: z.string().optional(),
	category: z.enum(["technical", "billing", "shipping", "product", "other"]).optional(),
})

export async function POST(req: NextRequest) {
	const rateLimitResponse = rateLimiter(req)
	if (rateLimitResponse) return rateLimitResponse

	try {
		const body = await req.json()
		const validated = contactSchema.parse(body)

		const ticket = await createTicket({
			customerName: validated.name,
			customerEmail: validated.email,
			customerPhone: validated.phone || "",
			subject: validated.subject,
			description: `${validated.message}\n\nOrder: ${validated.orderNumber || "N/A"}`,
			category: validated.category || "other",
			priority: "medium",
		})

		await sendEmail({
			to: "support@electrobuy.co.ke",
			subject: `New Support Ticket: ${validated.subject}`,
			html: `
				<h2>New Support Request</h2>
				<p><strong>Name:</strong> ${validated.name}</p>
				<p><strong>Email:</strong> ${validated.email}</p>
				<p><strong>Phone:</strong> ${validated.phone || "N/A"}</p>
				<p><strong>Order:</strong> ${validated.orderNumber || "N/A"}</p>
				<p><strong>Subject:</strong> ${validated.subject}</p>
				<p><strong>Message:</strong> ${validated.message}</p>
			`,
		})

		return NextResponse.json(
			{
				message:
					"Message sent successfully! We will get back to you within 24 hours.",
				ticketId: ticket.id,
			},
			{ status: 201 },
		)
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ message: "Validation error", errors: error.errors },
				{ status: 400 },
			)
		}
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}
