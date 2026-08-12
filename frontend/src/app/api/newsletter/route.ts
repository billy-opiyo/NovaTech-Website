import { NextRequest, NextResponse } from "next/server"
import { rateLimiter } from "backend/middleware/rateLimiter"
import { z } from "zod"

const newsletterSchema = z.object({
	email: z.string().email(),
})

export async function POST(req: NextRequest) {
	const rateLimitResponse = await rateLimiter(req, "newsletter")
	if (rateLimitResponse) return rateLimitResponse

	try {
		const body = await req.json()
		newsletterSchema.parse(body)
		return NextResponse.json(
			{ message: "Successfully subscribed to newsletter!" },
			{ status: 201 },
		)
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ message: "Invalid email", errors: error.errors },
				{ status: 400 },
			)
		}
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}
