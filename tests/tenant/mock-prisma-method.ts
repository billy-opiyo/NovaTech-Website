/** Replace one Prisma delegate method for a focused unit test and restore it safely. */
export function mockPrismaMethod(target: object, method: string, implementation: unknown): () => void {
	const delegate = target as unknown as Record<string, unknown>
	const original = delegate[method]
	delegate[method] = implementation
	return () => {
		delegate[method] = original
	}
}
