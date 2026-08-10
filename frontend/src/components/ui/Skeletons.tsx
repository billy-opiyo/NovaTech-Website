export function ProductCardSkeleton() {
	return (
		<div className="glass-card animate-pulse">
			<div className="h-52 bg-gray-300 dark:bg-gray-600 rounded-xl mb-4" />
			<div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/4 mb-2" />
			<div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2" />
			<div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-3" />
			<div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-1/3" />
		</div>
	)
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
	return (
		<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
			{Array.from({ length: count }).map((_, index) => (
				<ProductCardSkeleton key={index} />
			))}
		</div>
	)
}

export function ProductDetailSkeleton() {
	return (
		<div className="animate-pulse">
			<div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-8" />
			<div className="grid md:grid-cols-2 gap-8">
				<div>
					<div className="h-96 bg-gray-300 dark:bg-gray-600 rounded-2xl mb-4" />
					<div className="flex gap-3">
						{Array.from({ length: 4 }).map((_, index) => (
							<div
								key={index}
								className="h-20 w-20 bg-gray-300 dark:bg-gray-600 rounded-xl"
							/>
						))}
					</div>
				</div>
				<div className="space-y-4">
					<div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/4" />
					<div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
					<div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/3" />
					<div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-1/2" />
					<div className="h-24 bg-gray-300 dark:bg-gray-600 rounded" />
					<div className="h-12 bg-gray-300 dark:bg-gray-600 rounded" />
				</div>
			</div>
		</div>
	)
}

export function CartSkeleton() {
	return (
		<div className="animate-pulse space-y-4">
			{Array.from({ length: 3 }).map((_, index) => (
				<div key={index} className="glass-card p-4 flex gap-4">
					<div className="h-24 w-24 bg-gray-300 dark:bg-gray-600 rounded-xl flex-shrink-0" />
					<div className="flex-1 space-y-3">
						<div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
						<div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/4" />
						<div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/3" />
					</div>
				</div>
			))}
		</div>
	)
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
	return (
		<div className="animate-pulse">
			<div className="h-12 bg-gray-300 dark:bg-gray-600 rounded-t-xl mb-1" />
			{Array.from({ length: rows }).map((_, index) => (
				<div key={index} className="h-16 bg-gray-200 dark:bg-gray-700 mb-1" />
			))}
		</div>
	)
}
