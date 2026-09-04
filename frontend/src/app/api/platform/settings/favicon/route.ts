import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { uploadFile } from "backend/lib/storage"
import { hasAllowedFileSignature, IMAGE_TOO_LARGE_MESSAGE, MAX_IMAGE_UPLOAD_BYTES } from "backend/lib/file-validation"
import { ImageOptimizationTooLargeError, optimizeProductImage } from "backend/lib/image-optimization"

const imageKinds: Record<string, "JPEG" | "PNG" | "WEBP" | "GIF"> = {
	"image/jpeg": "JPEG",
	"image/png": "PNG",
	"image/webp": "WEBP",
	"image/gif": "GIF",
}

export async function POST(request: NextRequest) {
	const session = await auth()
	if (!session?.user?.id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })
	if (session.user.role !== "SUPERADMIN") return NextResponse.json({ message: "Super administrator access required" }, { status: 403 })

	try {
		const formData = await request.formData()
		const file = formData.get("file")
		if (!(file instanceof File)) return NextResponse.json({ message: "Please choose a favicon image." }, { status: 400 })
		const kind = imageKinds[file.type]
		if (!kind) return NextResponse.json({ message: "Use a JPG, PNG, WEBP, or GIF favicon image." }, { status: 400 })
		if (file.size > MAX_IMAGE_UPLOAD_BYTES) return NextResponse.json({ message: IMAGE_TOO_LARGE_MESSAGE }, { status: 400 })

		const buffer = Buffer.from(await file.arrayBuffer())
		if (!hasAllowedFileSignature(buffer, [kind])) return NextResponse.json({ message: "The uploaded image content is invalid." }, { status: 400 })
		const optimizedBuffer = await optimizeProductImage(buffer)
		const key = `platform/assets/favicon-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.webp`
		const url = await uploadFile(optimizedBuffer, key, "image/webp")
		return NextResponse.json({ url, key }, { status: 201 })
	} catch (error) {
		if (error instanceof ImageOptimizationTooLargeError) return NextResponse.json({ message: IMAGE_TOO_LARGE_MESSAGE }, { status: 400 })
		console.error("Platform favicon upload error:", error)
		return NextResponse.json({ message: "Unable to upload the platform favicon." }, { status: 500 })
	}
}
