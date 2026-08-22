import { randomUUID } from "node:crypto"

export type RequestLike = { headers: Headers }
export type ObservabilityContext = { requestId: string; tenantId?: string; actorId?: string; route?: string }

function safe(value: unknown) {
	if (typeof value === "string") return value.length > 500 ? `${value.slice(0, 500)}…` : value
	if (value instanceof Error) return value.message
	return value
}

export function getRequestId(request?: RequestLike) {
	const supplied = request?.headers.get("x-request-id")?.trim()
	return supplied && /^[a-zA-Z0-9._:-]{8,128}$/.test(supplied) ? supplied : randomUUID()
}

export function withRequestId<T extends Response>(response: T, requestId: string) {
	response.headers.set("x-request-id", requestId)
	return response
}

export function logEvent(level: "info" | "warn" | "error", event: string, context: ObservabilityContext, details?: Record<string, unknown>) {
	const payload = {
		timestamp: new Date().toISOString(),
		level,
		event,
		requestId: context.requestId,
		...(context.tenantId ? { tenantId: context.tenantId } : {}),
		...(context.actorId ? { actorId: context.actorId } : {}),
		...(context.route ? { route: context.route } : {}),
		...(details ? Object.fromEntries(Object.entries(details).map(([key, value]) => [key, safe(value)])) : {}),
	}
	console[level](JSON.stringify(payload))
}
