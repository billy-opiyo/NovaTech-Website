import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

function isPathUnder(pathname: string, basePath: string) {
	return pathname === basePath || pathname.startsWith(`${basePath}/`)
}

function redirectToSignIn(request: NextRequest) {
	const signInUrl = new URL("/auth/signin", request.url)
	const callbackUrl = `${request.nextUrl.pathname}${request.nextUrl.search}`
	signInUrl.searchParams.set("callbackUrl", callbackUrl)
	return NextResponse.redirect(signInUrl)
}

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl
	const token = await getToken({
		req: request,
		secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
		secureCookie: request.nextUrl.protocol === "https:",
	})
	const isAuthenticated = !!token
	const userRole = typeof token?.role === "string" ? token.role : undefined

	const isAdminRoute = isPathUnder(pathname, "/admin")
	const isWorkspaceRoute = isPathUnder(pathname, "/manage") || isPathUnder(pathname, "/platform")

	if (isAdminRoute) {
		if (!isAuthenticated) return redirectToSignIn(request)
		if (userRole !== "ADMIN" && userRole !== "SUPERADMIN") return NextResponse.redirect(new URL("/", request.url))
		return NextResponse.next()
	}

	if (isWorkspaceRoute) {
		if (!isAuthenticated) return redirectToSignIn(request)
		return NextResponse.next()
	}

	const isProtectedRoute = pathname.startsWith("/account/") || pathname === "/cart" || pathname === "/checkout"
	if (isProtectedRoute && !isAuthenticated) return redirectToSignIn(request)

	return NextResponse.next()
}

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
