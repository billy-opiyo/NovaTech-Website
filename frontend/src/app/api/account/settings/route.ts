import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "@/lib/auth"
import prisma from "backend/lib/db"
import { deleteFile, uploadFile, generateProfileFileKey } from "backend/lib/storage"
import { hasAllowedFileSignature, IMAGE_TOO_LARGE_MESSAGE, MAX_IMAGE_UPLOAD_BYTES, type ValidatedFileKind } from "backend/lib/file-validation"

const settingsSchema = z.object({
	name: z.string().trim().min(2).max(100),
	marketingEmails: z.boolean(),
	orderUpdates: z.boolean(),
	preferredTheme: z.enum(["light", "dark"]),
})

const profileImageTypes = new Map<string, { extension: string; kind: ValidatedFileKind }>([
	["image/jpeg", { extension: "jpg", kind: "JPEG" }],
	["image/png", { extension: "png", kind: "PNG" }],
	["image/webp", { extension: "webp", kind: "WEBP" }],
	["image/gif", { extension: "gif", kind: "GIF" }],
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
		const imageType = profileImageTypes.get(file.type)
		if (!imageType) return NextResponse.json({ message: "Use a JPG, PNG, WEBP, or GIF image." }, { status: 400 })
		if (file.size > MAX_IMAGE_UPLOAD_BYTES) return NextResponse.json({ message: IMAGE_TOO_LARGE_MESSAGE }, { status: 400 })

		const buffer = Buffer.from(await file.arrayBuffer())
		if (!hasAllowedFileSignature(buffer, [imageType.kind])) return NextResponse.json({ message: "The uploaded image content is invalid." }, { status: 400 })

		const previousUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { image: true } })
		if (!previousUser) return NextResponse.json({ message: "Account not found." }, { status: 404 })
		const key = generateProfileFileKey(session.user.id, `profile.${imageType.extension}`)
		let uploaded = false
		try {
			const url = await uploadFile(buffer, key, file.type)
			uploaded = true
			const user = await prisma.user.update({ where: { id: session.user.id }, data: { image: url }, select: userSelect })
			const publicRoot = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/+$/, "")
			const previousKey = publicRoot && previousUser.image?.startsWith(`${publicRoot}/`)
				? previousUser.image.slice(publicRoot.length + 1)
				: null
			if (previousKey && previousKey !== key) await deleteFile(previousKey).catch((error) => console.error("Previous profile image cleanup failed:", error))
			return NextResponse.json({ user }, { status: 201 })
		} catch (error) {
			if (uploaded) await deleteFile(key).catch(() => undefined)
			throw error
		}
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
