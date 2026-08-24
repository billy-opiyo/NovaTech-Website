export function normalizePagination(page?: number, limit?: number, defaultLimit = 20, maxLimit = 100) {
	const safePage = Number.isInteger(page) ? Math.max(1, page as number) : 1
	const safeLimit = Number.isInteger(limit) ? Math.min(maxLimit, Math.max(1, limit as number)) : defaultLimit
	return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit }
}

export function parsePagination(params: URLSearchParams, defaultLimit = 20, maxLimit = 100) {
	const rawPage = Number.parseInt(params.get("page") || "", 10)
	const rawLimit = Number.parseInt(params.get("limit") || "", 10)
	return normalizePagination(Number.isFinite(rawPage) ? rawPage : undefined, Number.isFinite(rawLimit) ? rawLimit : undefined, defaultLimit, maxLimit)
}
