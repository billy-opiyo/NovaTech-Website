import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "backend/lib/db"
import { rateLimiter } from "backend/middleware/rateLimiter"
import { matchesEmailVerificationCode } from "backend/lib/email-verification"

const schema = z.object({ email: z.string().email(), code: z.string().regex(/^\d{6}$/, "Enter the six-digit code") })

export async function POST(request: NextRequest) {
	try {
		const input = schema.parse(await request.json())
		const email = input.email.trim().toLowerCase()
		const ipLimited = await rateLimiter(request, "auth-verify-email-ip")
		if (ipLimited) return ipLimited
		const accountLimited = await rateLimiter(request, "auth-verify-email-account", email)
		if (accountLimited) return accountLimited
		const token = await prisma.verificationToken.findFirst({ where: { identifier: `verify:${email}` } })
		if (!token || token.expires < new Date() || !matchesEmailVerificationCode(token.token, input.code)) return NextResponse.json({ message: "That code is invalid or expired." }, { status: 400 })
		await prisma.$transaction([
			prisma.user.update({ where: { email }, data: { emailVerified: new Date() } }),
			prisma.verificationToken.deleteMany({ where: { identifier: `verify:${email}` } }),
		])
		return NextResponse.json({ message: "Email verified successfully." })
	} catch (error) {
		if (error instanceof z.ZodError) return NextResponse.json({ message: "Enter a valid email and six-digit code." }, { status: 400 })
		return NextResponse.json({ message: "Unable to verify your email right now." }, { status: 500 })
	}
}
