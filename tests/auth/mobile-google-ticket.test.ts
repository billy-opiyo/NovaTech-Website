import { test } from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import prisma from "../../backend/lib/db"
import { authorizeMobileGoogleTicket } from "../../backend/lib/mobile-google-ticket"
import { mockPrismaMethod } from "../tenant/mock-prisma-method"

const verifier = "V".repeat(43)
const challenge = createHash("sha256").update(verifier).digest("base64url")

test("mobile Google ticket is hashed, consumed once, and returns the shared account", async () => {
	const ticket = "A".repeat(43)
	const grant = {
		identifier: `mobile-google:${challenge}:user-123`,
		expires: new Date(Date.now() + 60_000),
	}
	const tokenQueries: Array<{ where: { token: string } }> = []
	let consumeCount = 1
	const transaction = {
		verificationToken: {
			findUnique: async ({ where }: { where: { token: string } }) => {
				tokenQueries.push({ where })
				return grant
			},
			deleteMany: async () => ({ count: consumeCount-- }),
		},
		user: {
			findUnique: async ({ where }: { where: { id: string } }) => ({
				id: where.id,
				email: "billy@example.com",
				name: "Billy",
				image: null,
				role: "USER",
				platformRole: null,
			}),
		},
	}
	const restoreTransaction = mockPrismaMethod(prisma, "$transaction", async (callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction))

	try {
		const firstUse = await authorizeMobileGoogleTicket(ticket, verifier)
		const replay = await authorizeMobileGoogleTicket(ticket, verifier)
		assert.deepEqual(firstUse, {
			id: "user-123",
			email: "billy@example.com",
			name: "Billy",
			image: null,
			role: "USER",
			platformRole: undefined,
		})
		assert.equal(replay, null)
		assert.equal(tokenQueries.length, 2)
		assert.match(tokenQueries[0].where.token, /^[a-f0-9]{64}$/)
		assert.notEqual(tokenQueries[0].where.token, ticket)
	} finally {
		restoreTransaction()
	}
})

test("mobile Google ticket rejects malformed and expired grants", async () => {
	let transactionCalls = 0
	const transaction = {
		verificationToken: {
			findUnique: async () => ({ identifier: `mobile-google:${challenge}:user-123`, expires: new Date(Date.now() - 1000) }),
			deleteMany: async () => ({ count: 1 }),
		},
		user: {
			findUnique: async () => ({ id: "user-123", email: "billy@example.com", name: "Billy", image: null, role: "USER", platformRole: null }),
		},
	}
	const restoreTransaction = mockPrismaMethod(prisma, "$transaction", async (callback: (tx: typeof transaction) => Promise<unknown>) => {
		transactionCalls += 1
		return callback(transaction)
	})

	try {
		assert.equal(await authorizeMobileGoogleTicket("malformed", verifier), null)
		assert.equal(await authorizeMobileGoogleTicket("B".repeat(43), verifier), null)
		assert.equal(await authorizeMobileGoogleTicket("B".repeat(43), "malformed"), null)
		assert.equal(transactionCalls, 1)
	} finally {
		restoreTransaction()
	}
})

test("mobile Google ticket requires the matching app-held PKCE verifier", async () => {
	const ticket = "C".repeat(43)
	const grant = {
		identifier: `mobile-google:${challenge}:user-123`,
		expires: new Date(Date.now() + 60_000),
	}
	let consumed = false
	const transaction = {
		verificationToken: {
			findUnique: async () => grant,
			deleteMany: async () => { consumed = true; return { count: 1 } },
		},
		user: {
			findUnique: async ({ where }: { where: { id: string } }) => ({
				id: where.id,
				email: "billy@example.com",
				name: "Billy",
				image: null,
				role: "USER",
				platformRole: null,
			}),
		},
	}
	const restoreTransaction = mockPrismaMethod(prisma, "$transaction", async (callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction))

	try {
		assert.equal(await authorizeMobileGoogleTicket(ticket, "W".repeat(43)), null)
		assert.equal(consumed, false)
		assert.equal((await authorizeMobileGoogleTicket(ticket, verifier))?.id, "user-123")
		assert.equal(consumed, true)
	} finally {
		restoreTransaction()
	}
})
