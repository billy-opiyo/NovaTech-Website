import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import prisma from "backend/lib/db"
import { sendEmail } from "backend/lib/email"
import { rateLimiter } from "backend/middleware/rateLimiter"

export async function POST(request: NextRequest) {
	const limited = await rateLimiter(request, "auth-resend-verification")
	if (limited) return limited
	try {
		const { email: rawEmail } = await request.json()
		const email = String(rawEmail || "").trim().toLowerCase()
		const user = await prisma.user.findUnique({ where: { email } })
		if (user && !user.emailVerified) {
			const code = crypto.randomInt(100000, 1000000).toString()
			const identifier = `verify:${email}`
			await prisma.verificationToken.deleteMany({ where: { identifier } })
			await prisma.verificationToken.create({ data: { identifier, token: code, expires: new Date(Date.now() + 15 * 60 * 1000) } })
			await sendEmail({ to: email, subject: "Your NovaTech Store verification code", html: `<p>Your NovaTech Store verification code is:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0070f3">${code}</p><p>This code expires in 15 minutes.</p>` })
		}
		return NextResponse.json({ message: "If the account needs verification, a new code has been sent." })
	} catch {
		return NextResponse.json({ message: "If the account needs verification, a new code has been sent." })
	}
}
