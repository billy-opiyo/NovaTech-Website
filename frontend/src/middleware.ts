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
	const isWorkspaceRoute = isPathUnder(pathname, "/manage") || isPathUnder(pathname, "/platform") || isPathUnder(pathname, "/admin")
	const explicitPlatformHome = request.nextUrl.searchParams.get("platformHome") === "1"
	const isPlatformRoot = pathname === "/"

	let rewriteUrl: URL | null = null
	let explicitStoreSlug: string | null = null
	let selectedWorkspaceStoreSlug: string | null = null
	if (isPlatformHost && pathname.startsWith(PLATFORM_STORE_PREFIX)) {
		const [, , rawSlug, ...rest] = pathname.split("/")
		const slug = rawSlug?.toLowerCase()
		if (isValidStoreSlug(slug)) {
			rewriteUrl = request.nextUrl.clone()
			rewriteUrl.pathname = rest.length ? `/${rest.join("/")}` : "/"
			explicitStoreSlug = slug
			requestHeaders.set("x-nurava-store-slug", slug)
		}
	}

	if (isPlatformHost && (explicitPlatformHome || isPlatformRoot)) {
		requestHeaders.delete("x-nurava-store-slug")
		const response = NextResponse.next({ request: { headers: requestHeaders } })
		response.cookies.delete(PLATFORM_STORE_COOKIE)
		return response
	}

	if (rewriteUrl) {
		// Keep the explicit store slug attached to the rewritten request.
	} else if (isPlatformHost && (isPathUnder(pathname, "/manage") || isPathUnder(pathname, "/admin"))) {
		const requestedStoreSlug = request.nextUrl.searchParams.get("store")?.trim().toLowerCase()
		const savedSlug = request.cookies.get(PLATFORM_STORE_COOKIE)?.value?.toLowerCase()
		const selectedSlug = isValidStoreSlug(requestedStoreSlug) ? requestedStoreSlug : savedSlug
		if (isValidStoreSlug(selectedSlug)) {
			selectedWorkspaceStoreSlug = selectedSlug
			requestHeaders.set("x-nurava-store-slug", selectedSlug)
		}
		else requestHeaders.delete("x-nurava-store-slug")
	} else {
		requestHeaders.delete("x-nurava-store-slug")
	}

	const respond = () => {
		const response = rewriteUrl
			? NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
			: NextResponse.next({ request: { headers: requestHeaders } })
		if (explicitStoreSlug) {
			response.cookies.set(PLATFORM_STORE_COOKIE, explicitStoreSlug, { httpOnly: true, sameSite: "lax", secure: request.nextUrl.protocol === "https:", path: "/", maxAge: 60 * 60 * 24 * 30 })
		}
		return response
	}

	// Merchant catalogue and checkout routes must always carry an explicit
	// store prefix on the shared platform host. This prevents a stale cookie or
	// the default tenant from rendering merchant content at platform URLs.
	const isUnscopedMerchantRoute = pathname === "/products"
		|| pathname.startsWith("/products/")
		|| pathname === "/category"
		|| pathname.startsWith("/category/")
		|| pathname === "/deals"
		|| pathname.startsWith("/deals/")
		|| pathname === "/cart"
		|| pathname === "/checkout"
	if (isPlatformHost && !rewriteUrl && isUnscopedMerchantRoute) {
		return NextResponse.redirect(new URL("/stores?all=1", request.url))
	}

	const token = await getToken({
		req: request,
		secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
		secureCookie: request.nextUrl.protocol === "https:",
	})
	const isAuthenticated = !!token
	const userRole = typeof token?.role === "string" ? token.role : undefined

	// Once a merchant store has been selected, keep the workspace URL under that
	// store. This keeps workspace requests tenant-identifiable in the address.
	if (isAuthenticated && isPlatformHost && !rewriteUrl && selectedWorkspaceStoreSlug && (isPathUnder(pathname, "/manage") || isPathUnder(pathname, "/admin"))) {
		const scopedUrl = new URL(`${PLATFORM_STORE_PREFIX}${selectedWorkspaceStoreSlug}${pathname}`, request.url)
		for (const [key, value] of request.nextUrl.searchParams) {
			if (key !== "store") scopedUrl.searchParams.append(key, value)
		}
		return NextResponse.redirect(scopedUrl)
	}

	const effectivePathname = rewriteUrl?.pathname || pathname
	const isAdminRoute = isPathUnder(effectivePathname, "/admin")
	if (isAdminRoute) {
		if (!isAuthenticated) return redirectToSignIn(request, "admin")
		if (userRole !== "ADMIN" && userRole !== "SUPERADMIN") return redirectToSignIn(request, "admin", true)
		return respond()
	}

	if (isWorkspaceRoute) {
		if (!isAuthenticated) return redirectToSignIn(request, pathname.startsWith("/platform") ? "platform" : "manage")
		return respond()
	}

	const isProtectedRoute = effectivePathname.startsWith("/account/") || effectivePathname === "/account" || effectivePathname === "/cart" || effectivePathname === "/checkout"
	if (isProtectedRoute && !isAuthenticated) return redirectToSignIn(request)

	return respond()
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
