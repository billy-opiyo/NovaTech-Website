import NextAuth from "next-auth"
import type { User, Session } from "next-auth"
import type { JWT } from "next-auth/jwt"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { createHash } from "node:crypto"
import bcrypt from "bcrypt"
import prisma from "backend/lib/db"
import { getPlatformDomain } from "backend/lib/platform-domain"
import { normalizeHostname, resolveTenantFromRequest } from "backend/lib/tenant"

async function resolveLoginTenantId(headers: Headers | undefined): Promise<string | undefined> {
	const hostname = normalizeHostname(headers?.get("host"))
	const platformDomain = getPlatformDomain()
	const isPlatformHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === platformDomain || hostname === `www.${platformDomain}`
	if (!hostname || isPlatformHost) return undefined

	try {
		return (await resolveTenantFromRequest({ headers: headers! })).tenantId
	} catch {
		// Login telemetry must never make authentication fail for an unknown host.
		return undefined
	}
}

async function recordLoginEvent(data: { tenantId?: string; userId?: string; email: string; ipAddress?: string; userAgent?: string; success: boolean }) {
	await prisma.loginEvent.create({ data }).catch(() => undefined)
}

export const authOptions = {
	providers: [
		Google({
			clientId: process.env.AUTH_GOOGLE_ID!,
			clientSecret: process.env.AUTH_GOOGLE_SECRET!,
		}),
		Credentials({
			name: "credentials",
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" },
			},
			async authorize(credentials, request) {
				const email = String(credentials?.email || "").trim().toLowerCase()
				const ipAddress = request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim()
				const userAgent = request?.headers?.get("user-agent") || undefined
				if (!email || !credentials?.password) return null
				const tenantId = await resolveLoginTenantId(request?.headers)

				const user = await prisma.user.findUnique({
					where: { email },
				})

				if (!user || !user.passwordHash) {
					await recordLoginEvent({ tenantId, email, ipAddress, userAgent, success: false })
					return null
				}

				const isValid = await bcrypt.compare(
					credentials.password as string,
					user.passwordHash,
				)

				if (!isValid) {
					await recordLoginEvent({ tenantId, email, userId: user.id, ipAddress, userAgent, success: false })
					return null
				}
				if (!user.emailVerified) {
					await recordLoginEvent({ tenantId, email, userId: user.id, ipAddress, userAgent, success: false })
					return null
				}
				await recordLoginEvent({ tenantId, email, userId: user.id, ipAddress, userAgent, success: true })

				return {
					id: user.id,
					email: user.email,
					name: user.name,
					image: user.image,
					role: user.role,
					platformRole: user.platformRole || undefined,
				}
			},
		}),
		Credentials({
			id: "mobile-ticket",
			name: "Mobile sign-in ticket",
			credentials: {
				ticket: { label: "One-time sign-in ticket", type: "text" },
			},
			async authorize(credentials) {
				const ticket = String(credentials?.ticket || "")
				if (!/^[A-Za-z0-9_-]{40,64}$/.test(ticket)) return null

				const token = createHash("sha256").update(ticket).digest("hex")
				const now = new Date()
				const user = await prisma.$transaction(async (transaction) => {
					const grant = await transaction.verificationToken.findUnique({ where: { token } })
					const prefix = "mobile-google:"
					if (!grant || !grant.identifier.startsWith(prefix) || grant.expires <= now) return null

					const consumed = await transaction.verificationToken.deleteMany({
						where: { token, identifier: grant.identifier, expires: { gt: now } },
					})
					if (consumed.count !== 1) return null

					const id = grant.identifier.slice(prefix.length)
					if (!id) return null
					return transaction.user.findUnique({
						where: { id },
						select: { id: true, email: true, name: true, image: true, role: true, platformRole: true },
					})
				})
				if (!user) return null
				return { ...user, platformRole: user.platformRole || undefined }
			},
		}),
	],
	callbacks: {
		async signIn({ user, account }: { user: User; account?: { provider?: string } | null }) {
			if (account?.provider !== "google" || !user.email) return true

			const email = user.email.trim().toLowerCase()
			const databaseUser = await prisma.user.upsert({
				where: { email },
				update: {
					name: user.name || undefined,
					image: user.image || undefined,
					emailVerified: new Date(),
				},
				create: {
					email,
					name: user.name,
					image: user.image,
					emailVerified: new Date(),
				},
				select: { id: true, email: true, name: true, image: true, role: true, platformRole: true },
			})

			user.id = databaseUser.id
			user.email = databaseUser.email
			user.name = databaseUser.name
			user.image = databaseUser.image
			user.role = databaseUser.role
			user.platformRole = databaseUser.platformRole || undefined
			return true
		},
		async jwt({ token, user, trigger }: { token: JWT; user?: User; trigger?: "signIn" | "signUp" | "update" }) {
			if (user) {
				token.role = user.role
				token.platformRole = user.platformRole
				token.id = user.id
			}
			if (trigger === "update" && token.id) {
				const latestUser = await prisma.user.findUnique({ where: { id: token.id }, select: { role: true, platformRole: true } })
				if (latestUser) {
					token.role = latestUser.role
					token.platformRole = latestUser.platformRole || undefined
				}
			}
			return token
		},
		async session({ session, token }: { session: Session; token: JWT }) {
			if (session.user) {
				session.user.role = token.role as string
				session.user.platformRole = token.platformRole as string | undefined
				session.user.id = token.id as string
			}
			return session
		},
		async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
			if (url.startsWith("/") && !url.startsWith("//") && !url.includes("\\")) return `${baseUrl}${url}`
			try {
				const target = new URL(url)
				if (target.origin === baseUrl) return url
			} catch {
				// Fall through to the safe platform home for malformed URLs.
			}
			return baseUrl
		},
	},
	pages: {
		signIn: "/auth/signin",
		error: "/auth/error",
	},
	session: {
		strategy: "jwt" as const,
	},
}

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)

export async function getServerSession() {
	return auth()
}
