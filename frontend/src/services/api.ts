// Base API client with common fetch helpers

export class ApiError extends Error {
	status: number
	errors?: unknown

	constructor(message: string, status: number, errors?: unknown) {
		super(message)
		this.name = "ApiError"
		this.status = status
		this.errors = errors
	}
}

export async function apiFetch<T>(
	url: string,
	options: RequestInit = {},
): Promise<T> {
	const res = await fetch(url, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...options.headers,
		},
	})

	if (!res.ok) {
		let message = `Request failed with status ${res.status}`
		let errors: unknown
		try {
			const data = await res.json()
			if (data?.message) message = data.message
			errors = data?.errors
		} catch {
			// Non-JSON error body
		}
		throw new ApiError(message, res.status, errors)
	}

	return res.json() as Promise<T>
}

export function buildQueryString(
	params: Record<string, string | number | boolean | undefined | null>,
): string {
	const searchParams = new URLSearchParams()
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== null && value !== "") {
			searchParams.set(key, String(value))
		}
	}
	const qs = searchParams.toString()
	return qs ? `?${qs}` : ""
}