import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "@/lib/auth"
import prisma from "backend/lib/db"
import { uploadFile, generateProfileFileKey } from "backend/lib/storage"

const settingsSchema = z.object({
	name: z.string().trim().min(2).max(100),
	marketingEmails: z.boolean(),
	orderUpdates: z.boolean(),
	preferredTheme: z.enum(["light", "dark"]),
})

const profileImageTypes = new Map([
	["image/jpeg", "jpg"],
	["image/png", "png"],
	["image/webp", "webp"],
	["image/gif", "gif"],
])

const userSelect = { id: true, name: true, email: true, image: true, emailVerified: true, marketingEmails: true, orderUpdates: true, preferredTheme: true } as const

async function currentUser() {
	const session = await getServerSession()
	return session?.user?.id ? prisma.user.findUnique({ where: { id: session.user.id }, select: userSelect }) : null
}

export async function POST(request: NextRequest) {
	const session = await getServerSession()
	if (!session?.user?.id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })

	try {
		const formData = await request.formData()
		const file = formData.get("file")
		if (!(file instanceof File)) return NextResponse.json({ message: "Please choose an image." }, { status: 400 })
		if (!profileImageTypes.has(file.type)) return NextResponse.json({ message: "Use a JPG, PNG, WEBP, or GIF image." }, { status: 400 })
		if (file.size > 5 * 1024 * 1024) return NextResponse.json({ message: "Profile images must be 5MB or smaller." }, { status: 400 })

		const extension = profileImageTypes.get(file.type)!
		const key = generateProfileFileKey(session.user.id, `profile.${extension}`)
		const url = await uploadFile(Buffer.from(await file.arrayBuffer()), key, file.type)
		const user = await prisma.user.update({ where: { id: session.user.id }, data: { image: url }, select: userSelect })
		return NextResponse.json({ user }, { status: 201 })
	} catch (error) {
		console.error("Profile image upload error:", error)
		return NextResponse.json({ message: "Unable to upload your profile image." }, { status: 500 })
	}
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
		const user = await prisma.user.update({ where: { id: session.user.id }, data: input, select: userSelect })
		return NextResponse.json({ user })
	} catch (error) {
		if (error instanceof z.ZodError) return NextResponse.json({ message: "Please check your settings and try again.", errors: error.errors }, { status: 400 })
		return NextResponse.json({ message: "Unable to save your settings." }, { status: 500 })
	}
}
