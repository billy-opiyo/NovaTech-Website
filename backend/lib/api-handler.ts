import { NextResponse } from "next/server"

type ErrorWithMetadata = { message?: string; status?: number; code?: string }

function metadata(error: unknown): ErrorWithMetadata {
	return error && typeof error === "object" ? error as ErrorWithMetadata : {}
}

export function apiErrorResponse(error: unknown, fallback = "Request unavailable") {
	const details = metadata(error)
	const status = Number.isInteger(details.status) ? details.status as number : details.code === "P2002" ? 409 : details.code === "P2025" ? 404 : 503
	const message = details.message && (details.status || details.code === "P2002" || details.code === "P2025") ? details.message : fallback
	return NextResponse.json({ message }, { status })
}

export function withApiError<T extends (...args: any[]) => Promise<Response>>(handler: T, ...args: Parameters<T>): Promise<Response> {
	return handler(...args).catch((error) => apiErrorResponse(error))
}
