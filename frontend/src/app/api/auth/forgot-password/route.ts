import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import prisma from "backend/lib/db"
import { sendEmail } from "backend/lib/email"
import { rateLimiter } from "backend/middleware/rateLimiter"

export async function POST(req: NextRequest) {
	const limited = await rateLimiter(req, "auth-forgot-password")
	if (limited) return limited
	try {
		const { email } = await req.json()
		const normalizedEmail = String(email || "").trim().toLowerCase()
		const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

		// Always return the same response to avoid account enumeration.
		if (user) {
			const token = crypto.randomBytes(32).toString("hex")
			await prisma.verificationToken.deleteMany({ where: { identifier: normalizedEmail } })
			await prisma.verificationToken.create({
				data: { identifier: normalizedEmail, token, expires: new Date(Date.now() + 60 * 60 * 1000) },
			})
			const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
			await sendEmail({
				to: normalizedEmail,
				subject: "Reset your NovaTech password",
				html: `<p>We received a request to reset your password.</p><p><a href="${appUrl}/auth/reset-password?token=${token}">Reset your password</a></p><p>This link expires in one hour.</p>`,
			})
		}
		return NextResponse.json({ message: "If an account exists, reset instructions have been sent." })
	} catch {
		return NextResponse.json({ message: "If an account exists, reset instructions have been sent." })
	}
}
