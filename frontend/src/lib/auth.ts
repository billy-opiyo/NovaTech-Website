import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import prisma from "backend/lib/db"

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
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.password) return null

				const user = await prisma.user.findUnique({
					where: { email: credentials.email as string },
				})

				if (!user || !user.passwordHash) return null

				const isValid = await bcrypt.compare(
					credentials.password as string,
					user.passwordHash,
				)

				if (!isValid) return null

				return {
					id: user.id,
					email: user.email,
					name: user.name,
					image: user.image,
					role: user.role,
				}
			},
		}),
	],
	callbacks: {
		async jwt({ token, user }: any) {
			if (user) {
				token.role = user.role
				token.id = user.id
			}
			return token
		},
		async session({ session, token }: any) {
			if (session.user) {
				session.user.role = token.role as string
				session.user.id = token.id as string
			}
			return session
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
