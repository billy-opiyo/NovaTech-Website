import { NextRequest, NextResponse } from "next/server"

const rateLimit = new Map<string, { count: number; timestamp: number }>()
const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 60

function pruneRateLimitRecords(now: number) {
	for (const [key, record] of rateLimit) {
		if (now - record.timestamp > WINDOW_MS) rateLimit.delete(key)
	}
}

export function rateLimiter(req: NextRequest) {
	const ip = req.headers.get("x-forwarded-for") || "anonymous"
	const now = Date.now()
	if (rateLimit.size > 10000) pruneRateLimitRecords(now)
	const record = rateLimit.get(ip)

	if (!record || now - record.timestamp > WINDOW_MS) {
		rateLimit.set(ip, { count: 1, timestamp: now })
		return null
	}

	if (record.count >= MAX_REQUESTS) {
		return NextResponse.json(
			{ message: "Too many requests. Please try again later." },
			{ status: 429 },
		)
	}

	record.count++
	return null
}
