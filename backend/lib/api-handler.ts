import { NextResponse } from "next/server"
import { getRequestId, logEvent, withRequestId } from "./observability"

type ErrorWithMetadata = { message?: string; status?: number; code?: string }

function metadata(error: unknown): ErrorWithMetadata {
	return error && typeof error === "object" ? error as ErrorWithMetadata : {}
}

export function apiErrorResponse(error: unknown, fallback = "Request unavailable") {
	const details = metadata(error)
	const knownMessages: Record<string, number> = {
		Unauthorized: 401,
		Forbidden: 403,
		"Product not found": 404,
		"Variant not found": 404,
		"Order not found": 404,
		"Review not found": 404,
		"Review not found or unauthorized": 404,
	}
	const knownStatus = details.message ? knownMessages[details.message] : undefined
	const candidateStatus = details.status
	const explicitStatus = Number.isInteger(candidateStatus) ? Number(candidateStatus) : undefined
	const status = explicitStatus !== undefined && explicitStatus >= 400 && explicitStatus <= 599 ? explicitStatus : details.code === "P2002" ? 409 : details.code === "P2025" ? 404 : knownStatus || 503
	const message = knownStatus ? details.message : details.code === "P2002" ? "Request conflicts with existing data" : details.code === "P2025" ? "Requested resource was not found" : fallback
	return NextResponse.json({ message }, { status })
}

export function withApiError<T extends (...args: any[]) => Promise<Response>>(handler: T, ...args: Parameters<T>): Promise<Response> {
	const request = args[0] as { headers?: Headers; url?: string } | undefined
	const requestId = getRequestId(request?.headers ? request as { headers: Headers } : undefined)
	return handler(...args)
		.then((response) => withRequestId(response, requestId))
		.catch((error) => {
			logEvent("error", "api_request_failed", { requestId, route: request?.url }, { message: error })
			return withRequestId(apiErrorResponse(error), requestId)
		})
}
