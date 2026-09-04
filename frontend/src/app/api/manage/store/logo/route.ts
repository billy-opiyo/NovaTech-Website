import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { generateTenantFileKey, uploadFile } from "backend/lib/storage"
import { hasAllowedFileSignature, IMAGE_TOO_LARGE_MESSAGE, MAX_IMAGE_UPLOAD_BYTES } from "backend/lib/file-validation"
import { ImageOptimizationTooLargeError, optimizeProductImage } from "backend/lib/image-optimization"
import { headers } from "next/headers"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireStorePermission } from "backend/lib/tenant-access"

const imageKinds: Record<string, "JPEG" | "PNG" | "WEBP" | "GIF"> = {
	"image/jpeg": "JPEG",
	"image/png": "PNG",
	"image/webp": "WEBP",
	"image/gif": "GIF",
}

export async function POST(request: NextRequest) {
	const session = await auth()
	if (!session?.user?.id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })

	try {
		const context = await resolveTenantFromRequest({ headers: await headers() }, { allowUnpublished: true })
		await requireStorePermission(session.user.id, context.tenantId, "MANAGE_STORE_SETTINGS")
		const formData = await request.formData()
		const file = formData.get("file")
		if (!(file instanceof File)) return NextResponse.json({ message: "Please choose a logo image." }, { status: 400 })
		const kind = imageKinds[file.type]
		if (!kind) return NextResponse.json({ message: "Use a JPG, PNG, WEBP, or GIF logo image." }, { status: 400 })
		if (file.size > MAX_IMAGE_UPLOAD_BYTES) return NextResponse.json({ message: IMAGE_TOO_LARGE_MESSAGE }, { status: 400 })

		const buffer = Buffer.from(await file.arrayBuffer())
		if (!hasAllowedFileSignature(buffer, [kind])) return NextResponse.json({ message: "The uploaded image content is invalid." }, { status: 400 })
		const optimizedBuffer = await optimizeProductImage(buffer)
		const key = generateTenantFileKey(context.tenantId, context.storeId, "general", "store-logo.webp")
		const url = await uploadFile(optimizedBuffer, key, "image/webp")
		return NextResponse.json({ url, key }, { status: 201 })
	} catch (error) {
		if (error instanceof ImageOptimizationTooLargeError) return NextResponse.json({ message: IMAGE_TOO_LARGE_MESSAGE }, { status: 400 })
		console.error("Store logo upload error:", error)
		return NextResponse.json({ message: "Unable to upload the store logo." }, { status: 500 })
	}
}
