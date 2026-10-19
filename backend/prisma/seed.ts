import { PrismaClient, Role } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

async function main() {
	if (process.env.NODE_ENV === "production") {
		throw new Error("The development seed is disabled in production. Use db:init-admin with explicit credentials.")
	}
	const seedPassword = process.env.SEED_ADMIN_PASSWORD
	if (!seedPassword || seedPassword.length < 16) {
		throw new Error("SEED_ADMIN_PASSWORD must be set to a random value of at least 16 characters for development seeding.")
	}
	console.log("🌱 Seeding database...")

	const adminHash = await bcrypt.hash(seedPassword, 12)
	const admin = await prisma.user.upsert({
		where: { email: "admin@nuravatech.com" },
		update: {},
		create: {
			name: "Admin User",
			email: "admin@nuravatech.com",
			passwordHash: adminHash,
			emailVerified: new Date(),
			role: "SUPERADMIN",
			platformRole: "PLATFORM_OWNER",
		},
	})
	console.log("✅ Admin user created:", admin.email)

	await prisma.plan.upsert({
		where: { key: "TRIAL" },
		update: {},
		create: { key: "TRIAL", name: "Trial", currency: "KES", active: true },
	})
	await prisma.plan.upsert({
		where: { key: "STARTER" },
		update: {},
		create: { key: "STARTER", name: "Starter", price: 1500, currency: "KES", billingInterval: "MONTH", setupFeeAmount: 5000, transactionFeePercent: 0, active: true, entitlementsJson: { productLimit: 50, staffAccounts: 3, storageGb: 2, analyticsLevel: "basic", customDomain: false, whatsappNotifications: false } },
	})
	await prisma.plan.upsert({
		where: { key: "BUSINESS" },
		update: {},
		create: { key: "BUSINESS", name: "Business", price: 3500, currency: "KES", billingInterval: "MONTH", setupFeeAmount: 5000, transactionFeePercent: 0, active: true, entitlementsJson: { productLimit: 250, staffAccounts: 15, storageGb: 10, analyticsLevel: "advanced", customDomain: true, whatsappNotifications: false } },
	})
	await prisma.plan.upsert({
		where: { key: "ENTERPRISE" },
		update: {},
		create: { key: "ENTERPRISE", name: "Enterprise", price: 8500, currency: "KES", billingInterval: "MONTH", setupFeeAmount: 1500, transactionFeePercent: 0, active: true, entitlementsJson: { productLimit: 1000, staffAccounts: 100, storageGb: 50, analyticsLevel: "advanced", customDomain: true, customDomainCount: 5, whatsappNotifications: false } },
	})
	await prisma.addon.createMany({
		data: [
			{ key: "whatsapp-notifications", name: "WhatsApp notifications", description: "Automated order and customer notifications.", price: 1000, currency: "KES", billingInterval: "MONTH", active: true },
			{ key: "advanced-analytics", name: "Advanced analytics", description: "Extended reports and operational insights.", price: 2500, currency: "KES", billingInterval: "MONTH", active: true },
			{ key: "extra-staff", name: "Extra staff accounts", description: "Additional team seats beyond the plan allowance.", price: 1500, currency: "KES", billingInterval: "MONTH", active: true },
		],
		skipDuplicates: true,
	})


	console.log("🎉 Seeding complete!")
}

main()
	.catch((e) => {
		console.error("❌ Seeding failed:", e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
