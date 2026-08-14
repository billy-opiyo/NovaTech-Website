const baseUrl = process.env.STAGING_URL
if (!baseUrl) {
	console.error("STAGING_URL is required")
	process.exit(1)
}

const health = await fetch(new URL("/api/health", baseUrl), { headers: { "cache-control": "no-cache" } })
const body = await health.json().catch(() => ({}))
if (!health.ok || body.ok !== true || body.database !== "up") {
	console.error("Staging health check failed", health.status, body)
	process.exit(1)
}
console.log(`Staging health check passed: ${baseUrl}`)
