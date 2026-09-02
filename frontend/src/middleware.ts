import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { isValidStoreSlug, isVercelProjectHostname, PLATFORM_STORE_COOKIE, PLATFORM_STORE_PREFIX } from "./lib/platform-store-route"

function isPathUnder(pathname: string, basePath: string) {
	return pathname === basePath || pathname.startsWith(`${basePath}/`)
}

function redirectToSignIn(request: NextRequest, portal?: "admin" | "manage" | "platform", unauthorized = false) {
	const signInUrl = new URL("/auth/signin", request.url)
	const callbackUrl = `${request.nextUrl.pathname}${request.nextUrl.search}`
	signInUrl.searchParams.set("callbackUrl", callbackUrl)
	signInUrl.searchParams.set("gate", "1")
	if (portal) signInUrl.searchParams.set("portal", portal)
	if (unauthorized) signInUrl.searchParams.set("reason", "unauthorized")
	return NextResponse.redirect(signInUrl)
}

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl
	const requestHeaders = new Headers(request.headers)
	requestHeaders.set("x-nurava-request-path", `${request.nextUrl.pathname}${request.nextUrl.search}`)
	const platformDomain = (process.env.PLATFORM_DOMAIN || "").trim().toLowerCase()
	const hostname = request.nextUrl.hostname.toLowerCase()
	const isPlatformHost = hostname === platformDomain || hostname === `www.${platformDomain}` || isVercelProjectHostname(hostname)
	const isWorkspaceRoute = isPathUnder(pathname, "/manage") || isPathUnder(pathname, "/platform")
	const isAuthRoute = isPathUnder(pathname, "/auth")
	const isStoreDirectoryRoute = isPathUnder(pathname, "/stores")
	const explicitPlatformHome = request.nextUrl.searchParams.get("platformHome") === "1"
	const isPlatformRoot = pathname === "/"

	if (isPlatformHost && pathname.startsWith(PLATFORM_STORE_PREFIX)) {
		const [, , rawSlug, ...rest] = pathname.split("/")
		const slug = rawSlug?.toLowerCase()
		if (isValidStoreSlug(slug)) {
			const rewriteUrl = request.nextUrl.clone()
			rewriteUrl.pathname = rest.length ? `/${rest.join("/")}` : "/"
			requestHeaders.set("x-nurava-store-slug", slug)
			const response = NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
			response.cookies.set(PLATFORM_STORE_COOKIE, slug, { httpOnly: true, sameSite: "lax", secure: request.nextUrl.protocol === "https:", path: "/", maxAge: 60 * 60 * 24 * 30 })
			return response
		}
	}

	if (isPlatformHost && (explicitPlatformHome || isPlatformRoot)) {
		requestHeaders.delete("x-nurava-store-slug")
		const response = NextResponse.next({ request: { headers: requestHeaders } })
		response.cookies.delete(PLATFORM_STORE_COOKIE)
		return response
	}

	if (isPlatformHost && isPathUnder(pathname, "/manage")) {
		const requestedStoreSlug = request.nextUrl.searchParams.get("store")?.trim().toLowerCase()
		const savedSlug = request.cookies.get(PLATFORM_STORE_COOKIE)?.value?.toLowerCase()
		const selectedSlug = isValidStoreSlug(requestedStoreSlug) ? requestedStoreSlug : savedSlug
		if (isValidStoreSlug(selectedSlug)) requestHeaders.set("x-nurava-store-slug", selectedSlug)
		else requestHeaders.delete("x-nurava-store-slug")
	} else if (isPlatformHost && !isPlatformRoot && !isWorkspaceRoute && !isAuthRoute && !isStoreDirectoryRoute) {
		const savedSlug = request.cookies.get(PLATFORM_STORE_COOKIE)?.value?.toLowerCase()
		if (isValidStoreSlug(savedSlug)) requestHeaders.set("x-nurava-store-slug", savedSlug)
		else requestHeaders.delete("x-nurava-store-slug")
	} else {
		requestHeaders.delete("x-nurava-store-slug")
	}

	const token = await getToken({
		req: request,
		secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
		secureCookie: request.nextUrl.protocol === "https:",
	})
	const isAuthenticated = !!token
	const userRole = typeof token?.role === "string" ? token.role : undefined

	const isAdminRoute = isPathUnder(pathname, "/admin")
	if (isAdminRoute) {
		if (!isAuthenticated) return redirectToSignIn(request, "admin")
		if (userRole !== "ADMIN" && userRole !== "SUPERADMIN") return redirectToSignIn(request, "admin", true)
		return NextResponse.next({ request: { headers: requestHeaders } })
	}

	if (isWorkspaceRoute) {
		if (!isAuthenticated) return redirectToSignIn(request, pathname.startsWith("/platform") ? "platform" : "manage")
		return NextResponse.next({ request: { headers: requestHeaders } })
	}

	const isProtectedRoute = pathname.startsWith("/account/") || pathname === "/cart" || pathname === "/checkout"
	if (isProtectedRoute && !isAuthenticated) return redirectToSignIn(request)

	return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
