export default function Loading() {
	return (
		<div className="flex min-h-[40vh] items-center justify-center" role="status" aria-label="Loading page">
			<span className="h-8 w-8 animate-spin rounded-full border-2 border-primary/25 border-t-primary" aria-hidden="true" />
			<span className="sr-only">Loading page…</span>
		</div>
	)
}
