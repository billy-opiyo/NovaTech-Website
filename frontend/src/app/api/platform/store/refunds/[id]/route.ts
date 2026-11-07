import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { isPlatformAdmin } from "backend/lib/platform-access"
import { getPlatformStore, isPlatformOwnedStore } from "backend/lib/platform-store"

const schema = z.object({ status: z.enum(["APPROVED", "PROCESSING", "COMPLETED", "REJECTED"]), providerReference: z.string().trim().max(160).optional() }).strict()

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await auth()
	if (!session?.user?.id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })
	if (!isPlatformAdmin(session)) return NextResponse.json({ message: "Platform administrator access required" }, { status: 403 })
	const store = await getPlatformStore()
	if (!isPlatformOwnedStore(store) || store?.tenant.kind !== "PLATFORM") return NextResponse.json({ message: "The platform-owned store has not been provisioned." }, { status: 404 })
	const parsed = schema.safeParse(await request.json().catch(() => null))
	if (!parsed.success) return NextResponse.json({ message: "Invalid refund update", issues: parsed.error.flatten() }, { status: 400 })
	const { id } = await params
	const current = await prisma.refund.findFirst({ where: { id, tenantId: store.tenantId, storeId: store.id }, select: { id: true, status: true } })
	if (!current) return NextResponse.json({ message: "Refund request not found" }, { status: 404 })
	if (["COMPLETED", "REJECTED"].includes(current.status)) return NextResponse.json({ message: "This refund record is already closed." }, { status: 409 })
	if (parsed.data.status === "COMPLETED" && !parsed.data.providerReference) return NextResponse.json({ message: "Record the provider reference after confirming the refund with the payment provider." }, { status: 400 })
	const refund = await prisma.refund.update({ where: { id }, data: { status: parsed.data.status, providerReference: parsed.data.providerReference || undefined, processedById: session.user.id, processedAt: ["COMPLETED", "REJECTED"].includes(parsed.data.status) ? new Date() : undefined } })
	return NextResponse.json({ refund })
}
