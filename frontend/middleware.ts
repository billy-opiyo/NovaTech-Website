import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "./src/lib/auth.js"

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
	const session = await auth()
	const isAuthenticated = !!session?.user
	const userRole = session?.user?.role

	// Check if the route is an admin route
	const isAdminRoute = isPathUnder(pathname, "/admin")
	const isWorkspaceRoute = isPathUnder(pathname, "/manage") || isPathUnder(pathname, "/platform")

	// Handle admin routes
	if (isAdminRoute) {
		// Redirect to sign-in if not authenticated
		if (!isAuthenticated) {
			return redirectToSignIn(request)
		}

		// Redirect to home if authenticated but not admin
		if (userRole !== "ADMIN" && userRole !== "SUPERADMIN") {
			return NextResponse.redirect(new URL("/", request.url))
		}

		return NextResponse.next()
	}

	if (isWorkspaceRoute) {
		if (!isAuthenticated) {
			return redirectToSignIn(request)
		}
		return NextResponse.next()
	}

	// Handle protected account routes
	const isProtectedRoute =
		pathname.startsWith("/account/") ||
		pathname === "/cart" ||
		pathname === "/checkout"

	if (isProtectedRoute && !isAuthenticated) {
		return redirectToSignIn(request)
	}

	return NextResponse.next()
}

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
