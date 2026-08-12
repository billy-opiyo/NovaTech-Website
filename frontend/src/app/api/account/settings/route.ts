import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "@/lib/auth"
import prisma from "backend/lib/db"

const settingsSchema = z.object({
	name: z.string().trim().min(2).max(100),
	marketingEmails: z.boolean(),
	orderUpdates: z.boolean(),
	preferredTheme: z.enum(["light", "dark"]),
})

async function currentUser() {
	const session = await getServerSession()
	return session?.user?.id ? prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, email: true, emailVerified: true, marketingEmails: true, orderUpdates: true, preferredTheme: true } }) : null
}

export async function GET() {
	const user = await currentUser()
	if (!user) return NextResponse.json({ message: "Authentication required" }, { status: 401 })
	return NextResponse.json({ user })
}

export async function PATCH(request: NextRequest) {
	const session = await getServerSession()
	if (!session?.user?.id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })
	try {
		const input = settingsSchema.parse(await request.json())
		const user = await prisma.user.update({ where: { id: session.user.id }, data: input, select: { id: true, name: true, email: true, emailVerified: true, marketingEmails: true, orderUpdates: true, preferredTheme: true } })
		return NextResponse.json({ user })
	} catch (error) {
		if (error instanceof z.ZodError) return NextResponse.json({ message: "Please check your settings and try again.", errors: error.errors }, { status: 400 })
		return NextResponse.json({ message: "Unable to save your settings." }, { status: 500 })
	}
}
