import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { deleteFile, uploadFile } from "backend/lib/storage"
import { generateTenantFileKey } from "backend/lib/storage"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireStorePermission } from "backend/lib/tenant-access"
import { MembershipRole } from "@prisma/client"
import prisma from "backend/lib/db"
import { assertTenantStorageLimit } from "backend/billing/subscription"

export async function POST(req: NextRequest) {
	try {
		const session = await getServerSession()
		if (!session?.user?.id) {
			return NextResponse.json({ message: "Forbidden" }, { status: 403 })
		}
		const context = await resolveTenantFromRequest(req)
		await requireStorePermission(session.user.id, context.tenantId, "MANAGE_CATALOG")

		const formData = await req.formData()
		const file = formData.get("file") as File | null
		const productId = (formData.get("productId") as string) || "general"
		if (productId !== "general" && !(await prisma.product.findFirst({ where: { id: productId, tenantId: context.tenantId }, select: { id: true } }))) return NextResponse.json({ message: "Product not found in this store" }, { status: 404 })

		if (!file) {
			return NextResponse.json(
				{ message: "No file provided" },
				{ status: 400 },
			)
		}

		// Validate file type (images only)
		if (!file.type.startsWith("image/")) {
			return NextResponse.json(
				{ message: "Only image files are allowed" },
				{ status: 400 },
			)
		}

		// Validate file size (max 5MB)
		if (file.size > 5 * 1024 * 1024) {
			return NextResponse.json(
				{ message: "File too large. Maximum size is 5MB." },
				{ status: 400 },
			)
		}

		await assertTenantStorageLimit(context.tenantId, file.size)

		const buffer = Buffer.from(await file.arrayBuffer())
		const key = generateTenantFileKey(context.tenantId, context.storeId, productId, file.name)

		const url = await uploadFile(buffer, key, file.type)
		try {
			await prisma.storageAsset.create({ data: { tenantId: context.tenantId, storeId: context.storeId, objectKey: key, bytes: file.size, kind: "PRODUCT_IMAGE" } })
		} catch (error) {
			await deleteFile(key).catch(() => undefined)
			throw error
		}

		return NextResponse.json({ url, key }, { status: 201 })
	} catch (error: any) {
		console.error("Product image upload error:", error)
		return NextResponse.json(
			{ message: error.message || "Upload failed" },
			{ status: error?.status || (error?.code === "ENTITLEMENT_LIMIT_REACHED" ? 409 : 500) },
		)
	}
}
