import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "node:crypto"
import { DomainType, MembershipRole } from "@prisma/client"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireMembership } from "backend/lib/tenant-access"
import { customDomainSchema } from "backend/validators/domainValidator"

async function access(request: NextRequest) {
	const session = await auth()
	if (!session?.user?.id) throw Object.assign(new Error("Authentication required"), { status: 401 })
	const context = await resolveTenantFromRequest(request)
	await requireMembership(session.user.id, context.tenantId, [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN])
	return { session, context }
}

export async function GET(request: NextRequest) {
	try {
		const { context } = await access(request)
		const domains = await prisma.domain.findMany({ where: { tenantId: context.tenantId, storeId: context.storeId }, select: { id: true, hostname: true, type: true, verificationStatus: true, sslStatus: true, isCanonical: true, verifiedAt: true, createdAt: true }, orderBy: { createdAt: "desc" } })
		return NextResponse.json({ domains })
	} catch (error: any) {
		return NextResponse.json({ message: error.message || "Domain settings unavailable" }, { status: error.status || 503 })
	}
}

export async function POST(request: NextRequest) {
	try {
		const { context } = await access(request)
		const parsed = customDomainSchema.safeParse(await request.json().catch(() => null))
		if (!parsed.success) return NextResponse.json({ message: "Enter a valid domain hostname.", issues: parsed.error.flatten() }, { status: 400 })
		const platformDomain = (process.env.PLATFORM_DOMAIN || "novatechstore.co.ke").replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase()
		if (parsed.data.hostname === platformDomain || parsed.data.hostname.endsWith(`.${platformDomain}`) || parsed.data.hostname.endsWith(".localhost")) return NextResponse.json({ message: "Use the store platform hostname for platform subdomains; custom domains must be independently owned hostnames." }, { status: 400 })
		const verificationToken = `novatech-domain-${randomBytes(18).toString("hex")}`
		const domain = await prisma.domain.create({ data: { tenantId: context.tenantId, storeId: context.storeId, hostname: parsed.data.hostname, type: DomainType.CUSTOM, verificationToken, verificationStatus: "PENDING" }, select: { id: true, hostname: true, type: true, verificationStatus: true, sslStatus: true, isCanonical: true, verifiedAt: true, createdAt: true } })
		return NextResponse.json({ domain, verification: { recordType: "TXT", name: `_novatech-verification.${domain.hostname}`, value: verificationToken, status: "pending_dns_check" } }, { status: 201 })
	} catch (error: any) {
		return NextResponse.json({ message: error.code === "P2002" ? "That domain is already registered." : error.message || "Unable to add domain" }, { status: error.status || (error.code === "P2002" ? 409 : 503) })
	}
}

export async function DELETE(request: NextRequest) {
	try {
		const { context } = await access(request)
		const id = request.nextUrl.searchParams.get("id")
		if (!id) return NextResponse.json({ message: "Domain id is required" }, { status: 400 })
		const domain = await prisma.domain.findFirst({ where: { id, tenantId: context.tenantId, storeId: context.storeId, type: DomainType.CUSTOM }, select: { id: true } })
		if (!domain) return NextResponse.json({ message: "Custom domain not found" }, { status: 404 })
		await prisma.domain.delete({ where: { id: domain.id } })
		return NextResponse.json({ ok: true })
	} catch (error: any) {
		return NextResponse.json({ message: error.message || "Unable to remove domain" }, { status: error.status || 503 })
	}
}
