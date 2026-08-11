import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { uploadFile, generateFileKey } from "backend/lib/storage"

export async function POST(req: NextRequest) {
	try {
		const session = await getServerSession()
		if (
			!session?.user ||
			(session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")
		) {
			return NextResponse.json({ message: "Forbidden" }, { status: 403 })
		}

		const formData = await req.formData()
		const file = formData.get("file") as File | null
		const productId = (formData.get("productId") as string) || "general"

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

		const buffer = Buffer.from(await file.arrayBuffer())
		const key = generateFileKey(productId, file.name)

		const url = await uploadFile(buffer, key, file.type)

		return NextResponse.json({ url, key }, { status: 201 })
	} catch (error: any) {
		console.error("Product image upload error:", error)
		return NextResponse.json(
			{ message: error.message || "Upload failed" },
			{ status: 500 },
		)
	}
}