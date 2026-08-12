import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { z } from "zod"
import prisma from "backend/lib/db"

const schema = z.object({ token: z.string().min(32), password: z.string().min(8).max(100) })

export async function POST(req: NextRequest) {
	try {
		const input = schema.parse(await req.json())
		const record = await prisma.verificationToken.findUnique({ where: { token: input.token } })
		if (!record || record.expires < new Date()) return NextResponse.json({ message: "This reset link is invalid or expired" }, { status: 400 })
		const passwordHash = await bcrypt.hash(input.password, 12)
		await prisma.user.update({ where: { email: record.identifier }, data: { passwordHash } })
		await prisma.verificationToken.delete({ where: { token: input.token } })
		return NextResponse.json({ message: "Password updated successfully" })
	} catch (error) {
		if (error instanceof z.ZodError) return NextResponse.json({ message: "Password must be at least 8 characters", errors: error.errors }, { status: 400 })
		return NextResponse.json({ message: "Unable to reset password" }, { status: 500 })
	}
}
