import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireMembership } from "backend/lib/tenant-access"
import { deletePrivateFile, generateVerificationFileKey, uploadPrivateFile } from "backend/lib/storage"
import { rateLimiter } from "backend/middleware/rateLimiter"

const evidenceTypes = ["GOVERNMENT_ID", "BUSINESS_REGISTRATION", "KRA_PIN", "LOCATION_PROOF", "MPESA_OWNERSHIP", "OWNER_DECLARATION"] as const
const evidenceSchema = z.object({ type: z.enum(evidenceTypes) })
const acceptedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"])
const maximumBytes = 10 * 1024 * 1024

async function access() {
	const session = await auth()
	if (!session?.user?.id) throw Object.assign(new Error("Authentication required"), { status: 401 })
	const context = await resolveTenantFromRequest({ headers: await headers() }, { allowUnpublished: true })
	await requireMembership(session.user.id, context.tenantId, ["STORE_OWNER", "STORE_ADMIN"])
	return { session, context }
}

export async function GET() {
	try {
		const { context } = await access()
		const evidence = await prisma.merchantVerificationEvidence.findMany({ where: { tenantId: context.tenantId }, orderBy: { createdAt: "desc" }, select: { id: true, type: true, status: true, contentType: true, sizeBytes: true, reviewedAt: true, reviewNote: true, createdAt: true } })
		return NextResponse.json({ evidence })
	} catch (error: any) {
		return NextResponse.json({ message: error.message || "Verification evidence unavailable" }, { status: error.status || 503 })
	}
}

export async function POST(request: NextRequest) {
	const limited = await rateLimiter(request, "merchant-verification-evidence")
	if (limited) return limited
	let objectKey: string | null = null
	try {
		const { session, context } = await access()
		const formData = await request.formData()
		const parsed = evidenceSchema.safeParse({ type: formData.get("type") })
		if (!parsed.success) return NextResponse.json({ message: "Choose a valid verification document type." }, { status: 400 })
		const file = formData.get("file")
		if (!(file instanceof File)) return NextResponse.json({ message: "Choose a verification document." }, { status: 400 })
		if (!acceptedTypes.has(file.type)) return NextResponse.json({ message: "Use a PDF, JPG, PNG, or WEBP document." }, { status: 400 })
		if (file.size < 1 || file.size > maximumBytes) return NextResponse.json({ message: "Verification documents must be smaller than 10MB." }, { status: 400 })
		const profile = await prisma.merchantVerificationProfile.findUnique({ where: { tenantId: context.tenantId }, select: { id: true } })
		if (!profile) return NextResponse.json({ message: "Save the merchant verification details first." }, { status: 409 })
		const evidenceId = crypto.randomUUID()
		objectKey = generateVerificationFileKey(context.tenantId, evidenceId, file.name)
		await uploadPrivateFile(Buffer.from(await file.arrayBuffer()), objectKey, file.type)
		const evidence = await prisma.merchantVerificationEvidence.create({ data: { id: evidenceId, tenantId: context.tenantId, type: parsed.data.type, objectKey, contentType: file.type, sizeBytes: file.size, uploadedById: session.user.id }, select: { id: true, type: true, status: true, contentType: true, sizeBytes: true, createdAt: true } })
		return NextResponse.json({ evidence }, { status: 201 })
	} catch (error: any) {
		if (objectKey) await deletePrivateFile(objectKey).catch(() => undefined)
		return NextResponse.json({ message: error.message || "Unable to upload verification evidence" }, { status: error.status || 503 })
	}
}
