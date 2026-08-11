import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "./src/lib/auth.js"

const publicRoutes = [
	"/",
	"/products",
	"/categories",
	"/deals",
	"/compare",
	"/contact",
	"/auth/signin",
	"/auth/signup",
	"/auth/error",
	"/api/auth",
]

const adminRoutes = ["/admin"]

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl
	const session = await auth()
	const isAuthenticated = !!session?.user
	const userRole = session?.user?.role

	// Check if the route is an admin route
	const isAdminRoute = adminRoutes.some((route) =>
		pathname.startsWith(route),
	)

	// Handle admin routes
	if (isAdminRoute) {
		// Redirect to sign-in if not authenticated
		if (!isAuthenticated) {
			const signInUrl = new URL("/auth/signin", request.url)
			signInUrl.searchParams.set("callbackUrl", pathname)
			return NextResponse.redirect(signInUrl)
		}

		// Redirect to home if authenticated but not admin
		if (userRole !== "ADMIN" && userRole !== "SUPERADMIN") {
			return NextResponse.redirect(new URL("/", request.url))
		}

		return NextResponse.next()
	}

	// Handle protected account routes
	const isProtectedRoute =
		pathname.startsWith("/account") ||
		pathname === "/cart" ||
		pathname === "/checkout" ||
		pathname === "/wishlist" ||
		pathname.startsWith("/orders")

	if (isProtectedRoute && !isAuthenticated) {
		const signInUrl = new URL("/auth/signin", request.url)
		signInUrl.searchParams.set("callbackUrl", pathname)
		return NextResponse.redirect(signInUrl)
	}

	return NextResponse.next()
}

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
