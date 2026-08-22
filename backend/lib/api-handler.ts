import { NextResponse } from "next/server"
import { getRequestId, logEvent, withRequestId } from "./observability"

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
	const request = args[0] as { headers?: Headers; url?: string } | undefined
	const requestId = getRequestId(request?.headers ? request as { headers: Headers } : undefined)
	return handler(...args)
		.then((response) => withRequestId(response, requestId))
		.catch((error) => {
			logEvent("error", "api_request_failed", { requestId, route: request?.url }, { message: error })
			return withRequestId(apiErrorResponse(error), requestId)
		})
}
