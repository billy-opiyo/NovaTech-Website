function getDatabaseIdentity(connectionString) {
	let url
	try {
		url = new URL(connectionString)
	} catch {
		throw new Error("Database URLs must be valid PostgreSQL connection URLs.")
	}

	if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
		throw new Error("Database URLs must use the postgres or postgresql scheme.")
	}

	const host = (url.searchParams.get("host") || url.hostname).trim().toLowerCase()
	const rawPort = url.searchParams.get("port") || url.port || "5432"
	const port = Number(rawPort)
	const database = url.searchParams.get("dbname") || decodeURIComponent(url.pathname.replace(/^\/+/, ""))

	if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !database) {
		throw new Error("Database URLs must include a valid host, port, and database name.")
	}

	return `${host}:${port}/${database}`
}

export function assertDistinctPostgresDatabases(sourceUrl, restoreUrl) {
	if (getDatabaseIdentity(sourceUrl) === getDatabaseIdentity(restoreUrl)) {
		throw new Error("Refusing backup verification: source and restore URLs identify the same PostgreSQL database.")
	}
}
