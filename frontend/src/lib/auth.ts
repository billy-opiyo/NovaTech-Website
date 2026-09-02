import NextAuth from "next-auth"
import type { User, Session } from "next-auth"
import type { JWT } from "next-auth/jwt"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
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
		async jwt({ token, user }: { token: JWT; user?: User }) {
			if (user) {
				token.role = user.role
				token.platformRole = user.platformRole
				token.id = user.id
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
