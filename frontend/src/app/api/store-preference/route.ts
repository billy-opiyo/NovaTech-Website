import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { LEGACY_PREFERRED_STORE_COOKIE, PREFERRED_STORE_COOKIE } from "@/lib/store-preference"
import { apiErrorResponse } from "backend/lib/api-handler"

function expireLegacyPreference(response: NextResponse) {
	response.cookies.set(LEGACY_PREFERRED_STORE_COOKIE, "", { path: "/", maxAge: 0 })
	return response
}

function localPreviewSlug(host: string | null): string | null {
	if (!host) return null
	const hostname = host.trim().toLowerCase().split(":")[0]
	if (hostname === "localhost" || hostname === "127.0.0.1") return "nuravatech"
	if (hostname.endsWith(".localhost")) return hostname.slice(0, -".localhost".length) || null
	return null
}

export async function POST(request: Request) {
	try {
		if (process.env.NODE_ENV !== "production") {
			const slug = localPreviewSlug(request.headers.get("host"))
			if (slug) {
				const response = NextResponse.json({ storeSlug: slug, persisted: false })
				response.cookies.set(PREFERRED_STORE_COOKIE, slug, {
					path: "/",
					maxAge: 60 * 60 * 24 * 180,
					httpOnly: false,
					sameSite: "lax",
					secure: false,
				})
				return expireLegacyPreference(response)
			}
		}

		const context = await resolveTenantFromRequest({ headers: request.headers })
		const session = await auth()
		if (session?.user?.id) {
			await prisma.$executeRaw`UPDATE "User" SET "preferredStoreId" = ${context.storeId} WHERE "id" = ${session.user.id}`
		}

		const response = NextResponse.json({ storeSlug: context.storeSlug })
		response.cookies.set(PREFERRED_STORE_COOKIE, context.storeSlug, {
			path: "/",
			maxAge: 60 * 60 * 24 * 180,
			httpOnly: false,
			sameSite: "lax",
			secure: process.env.NODE_ENV === "production",
		})
		return expireLegacyPreference(response)
	} catch (error) {
		return apiErrorResponse(error, "Store preference unavailable")
	}
}
