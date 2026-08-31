import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { z } from "zod"
import prisma from "backend/lib/db"
import { rateLimiter } from "backend/middleware/rateLimiter"
import { registerSchema } from "backend/validators/authValidator"
import crypto from "crypto"
import { escapeHtml } from "backend/lib/html"
import { hashEmailVerificationCode } from "backend/lib/email-verification"

function verificationIdentifier(email: string) {
	return `verify:${email}`
}

async function createVerificationCode(email: string) {
	const code = crypto.randomInt(100000, 1000000).toString()
	await prisma.verificationToken.deleteMany({ where: { identifier: verificationIdentifier(email) } })
	await prisma.verificationToken.create({
		data: {
			identifier: verificationIdentifier(email),
			token: hashEmailVerificationCode(code),
			expires: new Date(Date.now() + 15 * 60 * 1000),
		},
	})
	return code
}

export async function POST(req: NextRequest) {
	const rateLimitResponse = await rateLimiter(req, "auth-register")
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
		const code = await createVerificationCode(email)
		const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
		const { sendEmail } = await import("backend/lib/email")
		try {
			await sendEmail({
				to: email,
				subject: "Verify your Nurava Tech email",
				html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h1 style="color:#0070f3">Nurava Tech</h1><p>Hi ${escapeHtml(input.name.trim())},</p><p>Use this verification code to finish creating your account:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0070f3">${escapeHtml(code)}</p><p>This code expires in 15 minutes.</p><p><a href="${escapeHtml(appUrl)}/auth/verify-email?email=${encodeURIComponent(email)}">Open verification page</a></p></div>`,
			})
		} catch (error) {
			console.error("Verification email could not be sent:", error)
		}

		return NextResponse.json({ user, verificationRequired: true }, { status: 201 })
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
