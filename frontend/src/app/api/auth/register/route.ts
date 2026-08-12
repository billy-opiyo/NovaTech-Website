import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { z } from "zod"
import prisma from "backend/lib/db"
import { rateLimiter } from "backend/middleware/rateLimiter"
import { registerSchema } from "backend/validators/authValidator"

export async function POST(req: NextRequest) {
	const rateLimitResponse = rateLimiter(req)
	if (rateLimitResponse) return rateLimitResponse

	try {
		const input = registerSchema.parse(await req.json())
		const email = input.email.trim().toLowerCase()
		const existing = await prisma.user.findUnique({ where: { email } })

		if (existing) {
			return NextResponse.json(
				{ message: "An account with that email already exists" },
				{ status: 409 },
			)
		}

		const passwordHash = await bcrypt.hash(input.password, 12)
		const user = await prisma.user.create({
			data: { name: input.name.trim(), email, passwordHash },
			select: { id: true, name: true, email: true, role: true },
		})

		return NextResponse.json({ user }, { status: 201 })
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ message: "Validation error", errors: error.errors },
				{ status: 400 },
			)
		}

		return NextResponse.json(
			{ message: "Unable to create your account" },
			{ status: 500 },
		)
	}
}
