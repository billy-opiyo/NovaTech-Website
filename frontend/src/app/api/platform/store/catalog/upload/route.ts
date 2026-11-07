import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { isPlatformAdmin } from "backend/lib/platform-access"
import { getPlatformStore, isPlatformOwnedStore } from "backend/lib/platform-store"
import { deleteFile, generateTenantFileKey, uploadFile } from "backend/lib/storage"
import { hasAllowedFileSignature, IMAGE_TOO_LARGE_MESSAGE, MAX_IMAGE_UPLOAD_BYTES, type ValidatedFileKind } from "backend/lib/file-validation"
import { ImageOptimizationTooLargeError, optimizeProductImage } from "backend/lib/image-optimization"
import { apiErrorResponse } from "backend/lib/api-handler"

export async function POST(request: Request) {
	try {
		const session = await auth()
		if (!session?.user?.id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })
		if (!isPlatformAdmin(session)) return NextResponse.json({ message: "Platform administrator access required" }, { status: 403 })
		const store = await getPlatformStore()
		if (!store || !isPlatformOwnedStore(store)) return NextResponse.json({ message: "The platform-owned store has not been provisioned." }, { status: 404 })
		const file = (await request.formData()).get("file")
		if (!(file instanceof File)) return NextResponse.json({ message: "Choose an image file to upload." }, { status: 400 })
		const types: Record<string, ValidatedFileKind> = { "image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WEBP", "image/gif": "GIF" }
		if (!types[file.type]) return NextResponse.json({ message: "Upload a JPG, PNG, WEBP, or GIF image." }, { status: 400 })
		if (file.size > MAX_IMAGE_UPLOAD_BYTES) return NextResponse.json({ message: IMAGE_TOO_LARGE_MESSAGE }, { status: 400 })
		const input = Buffer.from(await file.arrayBuffer())
		if (!hasAllowedFileSignature(input, [types[file.type]])) return NextResponse.json({ message: "The uploaded image content is invalid." }, { status: 400 })
		const output = await optimizeProductImage(input)
		const key = generateTenantFileKey(store.tenantId, store.id, `platform-product-${randomUUID()}`, "product.webp")
		const asset = await prisma.storageAsset.create({ data: { tenantId: store.tenantId, storeId: store.id, objectKey: key, bytes: output.length, kind: "PRODUCT_IMAGE" } })
		try { return NextResponse.json({ url: await uploadFile(output, key, "image/webp"), key }, { status: 201 }) }
		catch (error) { await prisma.storageAsset.delete({ where: { id: asset.id } }).catch(() => undefined); await deleteFile(key).catch(() => undefined); throw error }
	} catch (error) {
		if (error instanceof ImageOptimizationTooLargeError) return NextResponse.json({ message: IMAGE_TOO_LARGE_MESSAGE }, { status: 400 })
		return apiErrorResponse(error, "Platform store image upload failed")
	}
}
