import { NextRequest, NextResponse } from "next/server"
import prisma from "../lib/db"

const WINDOW_MS = 60 * 1000
const MAX_REQUESTS = 60
const testBuckets = new Map<string, { count: number; windowStart: number }>()

/**
 * Distributed rate limiting backed by PostgreSQL. The bucket update is an
 * atomic Prisma increment, so limits remain consistent across app instances.
 */
async function distributedRateLimiter(req: NextRequest, scope: string, identity?: string) {
	const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
	const ip = forwarded || req.headers.get("x-real-ip") || "anonymous"
	const now = Date.now()
	const windowStart = new Date(Math.floor(now / WINDOW_MS) * WINDOW_MS)
	const expiresAt = new Date(windowStart.getTime() + WINDOW_MS)
	const key = `${scope}:${identity ? encodeURIComponent(identity) : ip}`

	try {
		const bucket = await prisma.rateLimitBucket.upsert({
			where: { key_windowStart: { key, windowStart } },
			create: { key, windowStart, expiresAt, count: 1 },
			update: { count: { increment: 1 } },
		})

		if (bucket.count > MAX_REQUESTS) {
			return NextResponse.json(
				{ message: "Too many requests. Please try again later." },
				{ status: 429, headers: { "Retry-After": "60" } },
			)
		}

		if (Math.random() < 0.01) {
			await prisma.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: new Date() } } })
		}
		return null
	} catch (error) {
		// Do not silently fall back to a process-local limiter in production.
		console.error("Rate limiter storage unavailable", error)
		if (process.env.NODE_ENV === "production") {
			return NextResponse.json({ message: "Request protection unavailable" }, { status: 503 })
		}
		return null
	}
}

// Kept only for the existing synchronous unit-test contract. Every production
// route passes an explicit scope and uses distributedRateLimiter above.
export function rateLimiter(req: NextRequest): NextResponse | null
export function rateLimiter(req: NextRequest, scope: string): Promise<NextResponse | null>
export function rateLimiter(req: NextRequest, scope: string, identity: string): Promise<NextResponse | null>
export function rateLimiter(req: NextRequest, scope?: string, identity?: string): NextResponse | null | Promise<NextResponse | null> {
	if (scope) return distributedRateLimiter(req, scope, identity)
	if (process.env.NODE_ENV === "production") return NextResponse.json({ message: "Request protection requires a scoped limiter" }, { status: 503 })
	const ip = req.headers.get("x-forwarded-for") || "anonymous"
	const now = Date.now()
	const current = testBuckets.get(ip)
	if (!current || now - current.windowStart >= WINDOW_MS) {
		testBuckets.set(ip, { count: 1, windowStart: now })
		return null
	}
	if (current.count >= MAX_REQUESTS) return NextResponse.json({ message: "Too many requests. Please try again later." }, { status: 429 })
	current.count++
	return null
}
