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
where: { email: "admin@novatechstore.co.ke" },
		update: {},
		create: {
			name: "Admin User",
email: "admin@novatechstore.co.ke",
			passwordHash: adminHash,
			role: "SUPERADMIN",
		},
	})
	console.log("✅ Admin user created:", admin.email)

	const categories = await Promise.all([
		prisma.category.create({
			data: {
				name: "Phones",
				slug: "phones",
				description: "Smartphones from top brands",
				imageUrl: "https://placehold.co/400x300/0070f3/white?text=Phones",
			},
		}),
		prisma.category.create({
			data: {
				name: "Laptops",
				slug: "laptops",
				description: "Laptops for work, gaming, and creativity",
				imageUrl: "https://placehold.co/400x300/0070f3/white?text=Laptops",
			},
		}),
		prisma.category.create({
			data: {
				name: "Tablets",
				slug: "tablets",
				description: "Versatile tablets for everyone",
				imageUrl: "https://placehold.co/400x300/0070f3/white?text=Tablets",
			},
		}),
		prisma.category.create({
			data: {
				name: "Accessories",
				slug: "accessories",
				description: "Essential accessories for your devices",
				imageUrl: "https://placehold.co/400x300/0070f3/white?text=Accessories",
			},
		}),
		prisma.category.create({
			data: {
				name: "Gaming",
				slug: "gaming",
				description: "Gaming consoles, PCs, and accessories",
				imageUrl: "https://placehold.co/400x300/0070f3/white?text=Gaming",
			},
		}),
	])
	console.log("✅ Categories created")

	const products = await Promise.all([
		prisma.product.create({
			data: {
				name: "iPhone 15 Pro Max",
				slug: "iphone-15-pro-max",
				description:
					"The most powerful iPhone ever. A17 Pro chip, 48MP camera, and Titanium design.",
				brand: "Apple",
				sku: "IP15PM-256-TIT",
				price: 159999,
				discountedPrice: 149999,
				stock: 25,
				isFeatured: true,
				isNewArrival: true,
				warranty: "12 Months Official Warranty",
				specs: {
					Processor: "A17 Pro chip",
					RAM: "8GB",
					Storage: "256GB",
					Display: '6.7" Super Retina XDR OLED',
					Camera: "48MP + 12MP + 12MP",
					Battery: "4,422mAh",
					OS: "iOS 17",
				},
				images: [
					"/images/photo-1695048133142-1a20484d2569.jpg",
				],
				categoryId: categories[0].id,
			},
		}),
		prisma.product.create({
			data: {
				name: "MacBook Air M3",
				slug: "macbook-air-m3",
				description:
					"Supercharged by M3 chip. Thin, light, and incredibly fast.",
				brand: "Apple",
				sku: "MBA-M3-256-SLV",
				price: 189999,
				discountedPrice: 174999,
				stock: 15,
				isFeatured: true,
				warranty: "12 Months Official Warranty",
				specs: {
					Processor: "Apple M3 chip",
					RAM: "8GB Unified Memory",
					Storage: "256GB SSD",
					Display: '13.6" Liquid Retina',
					Battery: "Up to 18 hours",
					Weight: "1.24 kg",
					OS: "macOS Sonoma",
				},
				images: [
					"/images/photo-1517336714731-489689fd1ca8.jpg",
				],
				categoryId: categories[1].id,
			},
		}),
		prisma.product.create({
			data: {
				name: "Samsung Galaxy S24 Ultra",
				slug: "samsung-galaxy-s24-ultra",
				description: "Galaxy AI is here. The ultimate Galaxy experience.",
				brand: "Samsung",
				sku: "SGS24U-512-PHM",
				price: 134999,
				stock: 30,
				isFeatured: true,
				isNewArrival: true,
				warranty: "24 Months Official Warranty",
				specs: {
					Processor: "Snapdragon 8 Gen 3",
					RAM: "12GB",
					Storage: "512GB",
					Display: '6.8" Dynamic AMOLED 2X',
					Camera: "200MP + 50MP + 12MP + 10MP",
					Battery: "5,000mAh",
					OS: "Android 14",
				},
				images: [
					"/images/photo-1610945265064-0e34e5519bbf.jpg",
				],
				categoryId: categories[0].id,
			},
		}),
		prisma.product.create({
			data: {
				name: "Sony WH-1000XM5",
				slug: "sony-wh-1000xm5",
				description:
					"Industry-leading noise cancellation with premium sound quality.",
				brand: "Sony",
				sku: "WH1000XM5-BLK",
				price: 34999,
				stock: 40,
				isFeatured: true,
				warranty: "12 Months Official Warranty",
				specs: {
					Type: "Over-ear wireless",
					Battery: "30 hours",
					"Noise Cancelling": "Yes (Adaptive)",
					Connectivity: "Bluetooth 5.2",
					Weight: "250g",
				},
				images: [
					"/images/photo-1618366712010-f4ae9c647dcb.jpg",
				],
				categoryId: categories[3].id,
			},
		}),
		prisma.product.create({
			data: {
				name: "PlayStation 5",
				slug: "playstation-5",
				description:
					"Play has no limits. Experience lightning-fast loading and stunning graphics.",
				brand: "Sony",
				sku: "PS5-DISC-825",
				price: 74999,
				stock: 10,
				isNewArrival: true,
				warranty: "12 Months Official Warranty",
				specs: {
					Storage: "825GB SSD",
					Resolution: "Up to 8K",
					"Frame Rate": "Up to 120fps",
					"Ray Tracing": "Yes",
					"Backward Compatibility": "PS4 games",
				},
				images: [
					"/images/photo-1593305841991-05c297ba4575.jpg",
				],
				categoryId: categories[4].id,
			},
		}),
	])
	console.log("✅ Products created")

	await prisma.deliveryRegion.createMany({
		data: [
			{ name: "Nairobi", cost: 200, minDays: 1, maxDays: 2 },
			{ name: "Mombasa", cost: 500, minDays: 2, maxDays: 4 },
			{ name: "Kisumu", cost: 500, minDays: 2, maxDays: 5 },
			{ name: "Nakuru", cost: 400, minDays: 2, maxDays: 3 },
			{ name: "Eldoret", cost: 500, minDays: 2, maxDays: 4 },
			{ name: "Other", cost: 500, minDays: 3, maxDays: 7 },
		],
	})
	console.log("✅ Delivery regions created")

	await prisma.coupon.createMany({
		data: [
			{
				code: "TECH10",
				discountPercent: 10,
				minOrderValue: 5000,
				expiresAt: new Date("2025-12-31"),
				usageLimit: 100,
			},
			{
				code: "WELCOME20",
				discountPercent: 20,
				minOrderValue: 10000,
				expiresAt: new Date("2025-06-30"),
				usageLimit: 50,
			},
			{
				code: "FREESHIP",
				discountAmount: 500,
				expiresAt: new Date("2025-12-31"),
				usageLimit: 200,
			},
		],
	})
	console.log("✅ Coupons created")

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
