import { createHash } from "node:crypto"
import prisma from "./db"

const MOBILE_TICKET_PREFIX = "mobile-google:"

/** Consume a short-lived Google sign-in ticket and resolve its shared account. */
export async function authorizeMobileGoogleTicket(ticket: string) {
	if (!/^[A-Za-z0-9_-]{40,64}$/.test(ticket)) return null

	const token = createHash("sha256").update(ticket).digest("hex")
	const now = new Date()
	const user = await prisma.$transaction(async (transaction) => {
		const grant = await transaction.verificationToken.findUnique({ where: { token } })
		if (!grant || !grant.identifier.startsWith(MOBILE_TICKET_PREFIX) || grant.expires <= now) return null

		const consumed = await transaction.verificationToken.deleteMany({
			where: { token, identifier: grant.identifier, expires: { gt: now } },
		})
		if (consumed.count !== 1) return null

		const id = grant.identifier.slice(MOBILE_TICKET_PREFIX.length)
		if (!id) return null
		return transaction.user.findUnique({
			where: { id },
			select: { id: true, email: true, name: true, image: true, role: true, platformRole: true },
		})
	})
	if (!user) return null
	return { ...user, platformRole: user.platformRole || undefined }
}
