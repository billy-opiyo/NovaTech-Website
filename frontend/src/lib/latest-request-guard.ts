export function createLatestRequestGuard() {
	let latestRequest = 0

	return {
		begin() {
			latestRequest += 1
			return latestRequest
		},
		isCurrent(requestId: number) {
			return requestId === latestRequest
		},
		invalidate() {
			latestRequest += 1
		},
	}
}
