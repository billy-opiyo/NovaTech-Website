import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import prisma from "backend/lib/db"
import { emailWasAccepted, sendEmail } from "backend/lib/email"
import { rateLimiter } from "backend/middleware/rateLimiter"
import { hashEmailVerificationCode } from "backend/lib/email-verification"

export async function POST(request: NextRequest) {
	const limited = await rateLimiter(request, "auth-resend-verification")
	if (limited) return limited
	try {
		const { email: rawEmail } = await request.json()
		const email = String(rawEmail || "").trim().toLowerCase()
		const user = await prisma.user.findUnique({ where: { email } })
		if (user && !user.emailVerified) {
			const code = crypto.randomInt(100000, 1000000).toString()
			const token = hashEmailVerificationCode(code)
			const identifier = `verify:${email}`
			await prisma.verificationToken.deleteMany({ where: { identifier } })
			await prisma.verificationToken.create({ data: { identifier, token, expires: new Date(Date.now() + 15 * 60 * 1000) } })
			try {
				const delivery = await sendEmail({ to: email, subject: "Your Nurava Tech verification code", html: `<p>Your Nurava Tech verification code is:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0070f3">${code}</p><p>This code expires in 15 minutes.</p>` })
				if (!emailWasAccepted(delivery)) throw new Error("Verification email provider is not configured")
				await prisma.verificationToken.update({ where: { token }, data: { deliveryStatus: "DELIVERED", deliveryAttempts: { increment: 1 }, deliveredAt: new Date(), deliveryError: null } })
			} catch (error) {
				await prisma.verificationToken.update({ where: { token }, data: { deliveryStatus: "FAILED", deliveryAttempts: { increment: 1 }, deliveryError: error instanceof Error ? error.message.slice(0, 500) : "Email delivery failed" } }).catch(() => undefined)
			}
		}
		return NextResponse.json({ message: "If the account needs verification, a new code has been sent." })
	} catch {
		return NextResponse.json({ message: "If the account needs verification, a new code has been sent." })
	}
}
