import { PrismaClient, Role } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

async function main() {
	const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase()
	const password = process.env.INITIAL_ADMIN_PASSWORD
	if (!email || !password || password.length < 16 || !email.includes("@")) throw new Error("INITIAL_ADMIN_EMAIL and a 16+ character INITIAL_ADMIN_PASSWORD are required")
	const passwordHash = await bcrypt.hash(password, 12)
	const user = await prisma.user.upsert({ where: { email }, update: { passwordHash, role: Role.SUPERADMIN, emailVerified: new Date() }, create: { email, passwordHash, role: Role.SUPERADMIN, emailVerified: new Date(), name: "Super Administrator" } })
	console.log(`Admin account initialized: ${user.email}`)
}

main().catch((error) => { console.error(error.message); process.exitCode = 1 }).finally(() => prisma.$disconnect())
