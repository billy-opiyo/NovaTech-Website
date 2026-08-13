export default function Loading() {
	return (
		<div className="space-y-6 py-4" role="status" aria-label="Loading page">
			<div className="h-12 w-2/3 animate-pulse rounded-xl bg-gray-200/70 dark:bg-white/10" />
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 6 }).map((_, index) => (
					<div key={index} className="glass-card h-48 animate-pulse bg-gray-100/60 dark:bg-white/5" />
				))}
			</div>
			<span className="sr-only">Loading page…</span>
		</div>
	)
}
