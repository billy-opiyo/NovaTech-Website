import { randomUUID } from "crypto"
import prisma from "../lib/db"

export async function acquireScheduledJobLock(key: string, leaseMilliseconds = 10 * 60 * 1000) {
	const owner = randomUUID()
	const now = new Date()
	const expiresAt = new Date(now.getTime() + leaseMilliseconds)

	try {
		await prisma.scheduledJobLock.create({ data: { key, owner, acquiredAt: now, expiresAt } })
		return owner
	} catch (error: any) {
		if (error?.code !== "P2002") throw error
	}

	const reclaimed = await prisma.scheduledJobLock.updateMany({
		where: { key, expiresAt: { lte: now } },
		data: { owner, acquiredAt: now, expiresAt },
	})
	return reclaimed.count === 1 ? owner : null
}

export async function releaseScheduledJobLock(key: string, owner: string) {
	await prisma.scheduledJobLock.deleteMany({ where: { key, owner } })
}
