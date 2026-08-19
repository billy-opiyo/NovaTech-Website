import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { PREFERRED_STORE_COOKIE } from "@/lib/store-preference"

export async function POST(request: Request) {
	try {
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
		return response
	} catch (error) {
		return NextResponse.json({ message: error instanceof Error ? error.message : "Store preference unavailable" }, { status: 503 })
	}
}
