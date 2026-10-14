import { Prisma, PrismaClient, Role } from "@prisma/client"
import bcrypt from "bcrypt"
import { defaultCategoryImage, defaultIndustryHomepage } from "../lib/industry-content"

const prisma = new PrismaClient()

type DemoProductSeed = {
	name: string
	slug: string
	sku: string
	categorySlug: string
	description: string
	price: number
	stock: number
	image: string
	attributes?: Record<string, string | number | boolean>
	variants?: Array<{ name: string; value: string; priceModifier: number; stock: number; sku: string }>
}

async function seedIndustryDemoStore(input: {
	adminUserId: string
	planId: string
	industrySlug: "furniture" | "cakes"
	storeName: string
	storeSlug: string
	tenantId: string
	storeId: string
	products: DemoProductSeed[]
}) {
	const industry = await prisma.industry.findUnique({
		where: { slug: input.industrySlug },
		include: { defaultTheme: true, categoryTemplates: { where: { active: true }, orderBy: { displayOrder: "asc" } }, attributeDefinitions: { where: { active: true } }, storeTypes: { where: { active: true }, orderBy: { createdAt: "asc" }, take: 1 } },
	})
	if (!industry?.active) {
		console.warn(`Skipping ${input.storeName} demo: ${input.industrySlug} industry is not active.`)
		return
	}
	const tenant = await prisma.tenant.upsert({
		where: { id: input.tenantId },
		update: { legalName: input.storeName, status: "ACTIVE", verificationStatus: "APPROVED", verificationReviewedAt: new Date(), planId: input.planId },
		create: { id: input.tenantId, legalName: input.storeName, status: "ACTIVE", verificationStatus: "APPROVED", verificationReviewedAt: new Date(), planId: input.planId },
	})
	const themeSnapshot = industry.defaultTheme ? {
		colors: industry.defaultTheme.colors,
		typography: industry.defaultTheme.typography,
		heroLayout: industry.defaultTheme.heroLayout,
		bannerStyle: industry.defaultTheme.bannerStyle,
		productGridStyle: industry.defaultTheme.productGridStyle,
	} : undefined
	const homepage = {
		...defaultIndustryHomepage(industry, industry.homepagePreset),
		categories: industry.categoryTemplates.map((category) => ({ name: category.name, slug: category.slug, image: defaultCategoryImage(industry.slug, category.name, category.imageUrl) })),
	} as Prisma.InputJsonObject
	const themeSettings = themeSnapshot ? { themeId: industry.defaultTheme?.id, themeSlug: industry.defaultTheme?.slug, preset: "nova-blue-orange", themeSnapshot } as Prisma.InputJsonObject : undefined
	const store = await prisma.store.upsert({
		where: { id: input.storeId },
		update: { tenantId: tenant.id, industryId: industry.id, storeTypeId: industry.storeTypes[0]?.id, name: input.storeName, slug: input.storeSlug, publicationStatus: "PUBLISHED", publishedAt: new Date(), homepageSettings: homepage, themeSettings },
		create: { id: input.storeId, tenantId: tenant.id, industryId: industry.id, storeTypeId: industry.storeTypes[0]?.id, name: input.storeName, slug: input.storeSlug, publicationStatus: "PUBLISHED", publishedAt: new Date(), homepageSettings: homepage, themeSettings },
	})
	await prisma.membership.upsert({
		where: { tenantId_userId: { tenantId: tenant.id, userId: input.adminUserId } },
		update: { role: "STORE_OWNER", active: true, acceptedAt: new Date() },
		create: { tenantId: tenant.id, userId: input.adminUserId, role: "STORE_OWNER", active: true, acceptedAt: new Date() },
	})
	const categoryBySlug = new Map<string, string>()
	for (const template of industry.categoryTemplates) {
		const category = await prisma.category.upsert({
			where: { tenantId_slug: { tenantId: tenant.id, slug: template.slug } },
			update: { storeId: store.id, name: template.name, description: template.description, imageUrl: defaultCategoryImage(industry.slug, template.name, template.imageUrl) },
			create: { tenantId: tenant.id, storeId: store.id, name: template.name, slug: template.slug, description: template.description, imageUrl: defaultCategoryImage(industry.slug, template.name, template.imageUrl) },
		})
		categoryBySlug.set(category.slug, category.id)
	}
	for (const item of input.products) {
		const categoryId = categoryBySlug.get(item.categorySlug)
		if (!categoryId) continue
		const product = await prisma.product.upsert({
			where: { tenantId_slug: { tenantId: tenant.id, slug: item.slug } },
			update: { storeId: store.id, categoryId, name: item.name, description: item.description, brand: input.storeName, sku: item.sku, price: item.price, stock: item.stock, images: [item.image], isFeatured: true, isNewArrival: true },
			create: { tenantId: tenant.id, storeId: store.id, categoryId, name: item.name, slug: item.slug, description: item.description, brand: input.storeName, sku: item.sku, price: item.price, stock: item.stock, images: [item.image], isFeatured: true, isNewArrival: true },
		})
		for (const [key, value] of Object.entries(item.attributes || {})) {
			const definition = industry.attributeDefinitions.find((entry) => entry.key === key)
			if (!definition) continue
			await prisma.productAttributeValue.upsert({
				where: { productId_definitionId: { productId: product.id, definitionId: definition.id } },
				update: { value: value as Prisma.InputJsonValue, displayValue: String(value) },
				create: { productId: product.id, definitionId: definition.id, value: value as Prisma.InputJsonValue, displayValue: String(value) },
			})
		}
		for (const variant of item.variants || []) {
			await prisma.variant.upsert({
				where: { tenantId_sku: { tenantId: tenant.id, sku: variant.sku } },
				update: { productId: product.id, name: variant.name, value: variant.value, priceModifier: variant.priceModifier, stock: variant.stock },
				create: { tenantId: tenant.id, productId: product.id, name: variant.name, value: variant.value, priceModifier: variant.priceModifier, stock: variant.stock, sku: variant.sku },
			})
		}
	}
	for (const region of [{ name: "Nairobi", cost: 250, minDays: 1, maxDays: 2 }, { name: "Other", cost: 500, minDays: 2, maxDays: 5 }]) {
		const existingRegion = await prisma.deliveryRegion.findFirst({ where: { tenantId: tenant.id, name: region.name } })
		if (existingRegion) await prisma.deliveryRegion.update({ where: { id: existingRegion.id }, data: region })
		else await prisma.deliveryRegion.create({ data: { tenantId: tenant.id, ...region } })
	}
}

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

	const trialPlan = await prisma.plan.upsert({
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
	const tenant = await prisma.tenant.upsert({
		where: { id: "novatech-tenant" },
		update: { planId: trialPlan.id, status: "ACTIVE", verificationStatus: "APPROVED", verificationReviewedAt: new Date() },
		create: { id: "novatech-tenant", legalName: "Nurava Tech", status: "ACTIVE", verificationStatus: "APPROVED", verificationReviewedAt: new Date(), planId: trialPlan.id },
	})
	const store = await prisma.store.upsert({
		where: { id: "novatech-store" },
		update: { tenantId: tenant.id, industryId: "industry-electronics", storeTypeId: "store-type-electronics-retail", name: "Nurava Tech", slug: "nuravatech", publicationStatus: "PUBLISHED" },
		create: { id: "novatech-store", tenantId: tenant.id, industryId: "industry-electronics", storeTypeId: "store-type-electronics-retail", name: "Nurava Tech", slug: "nuravatech", publicationStatus: "PUBLISHED", publishedAt: new Date() },
	})
	await prisma.membership.upsert({
		where: { tenantId_userId: { tenantId: tenant.id, userId: admin.id } },
		update: { role: "STORE_OWNER", active: true, acceptedAt: new Date() },
		create: { tenantId: tenant.id, userId: admin.id, role: "STORE_OWNER", active: true, acceptedAt: new Date() },
	})
	console.log("✅ Nurava Tech tenant and store ready")

	const categories = await Promise.all([
		prisma.category.create({
			data: {
				tenantId: tenant.id,
				storeId: store.id,
				name: "Phones",
				slug: "phones",
				description: "Smartphones from top brands",
				imageUrl: "https://placehold.co/400x300/0070f3/white?text=Phones",
			},
		}),
		prisma.category.create({
			data: {
				tenantId: tenant.id,
				storeId: store.id,
				name: "Laptops",
				slug: "laptops",
				description: "Laptops for work, gaming, and creativity",
				imageUrl: "https://placehold.co/400x300/0070f3/white?text=Laptops",
			},
		}),
		prisma.category.create({
			data: {
				tenantId: tenant.id,
				storeId: store.id,
				name: "Tablets",
				slug: "tablets",
				description: "Versatile tablets for everyone",
				imageUrl: "https://placehold.co/400x300/0070f3/white?text=Tablets",
			},
		}),
		prisma.category.create({
			data: {
				tenantId: tenant.id,
				storeId: store.id,
				name: "Accessories",
				slug: "accessories",
				description: "Essential accessories for your devices",
				imageUrl: "https://placehold.co/400x300/0070f3/white?text=Accessories",
			},
		}),
		prisma.category.create({
			data: {
				tenantId: tenant.id,
				storeId: store.id,
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
				tenantId: tenant.id,
				storeId: store.id,
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
				tenantId: tenant.id,
				storeId: store.id,
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
				tenantId: tenant.id,
				storeId: store.id,
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
				tenantId: tenant.id,
				storeId: store.id,
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
				tenantId: tenant.id,
				storeId: store.id,
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

	await seedIndustryDemoStore({
		adminUserId: admin.id,
		planId: trialPlan.id,
		industrySlug: "furniture",
		storeName: "Nurava Furnitures",
		storeSlug: "nurava-furnitures",
		tenantId: "demo-furniture-tenant",
		storeId: "demo-furniture-store",
		products: [
			{ name: "Walnut Haven Bed", slug: "walnut-haven-bed", sku: "DEMO-FUR-BED-01", categorySlug: "beds", description: "A calm, well-proportioned solid-wood bed with a warm walnut finish, made for restorative nights and timeless bedrooms.", price: 68500, stock: 8, image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=85", attributes: { material: "Solid walnut wood", width: 160, height: 110, color: "Walnut" } },
			{ name: "Sunday Lounge Sofa", slug: "sunday-lounge-sofa", sku: "DEMO-FUR-SOFA-01", categorySlug: "sofas", description: "Sink into generous cushions, soft neutral upholstery, and a hand-finished wood frame made for slow Sundays and everyday company.", price: 92500, stock: 6, image: "https://images.unsplash.com/photo-1709746837880-f96b4f588ce5?auto=format&fit=crop&w=1200&q=85", attributes: { material: "Walnut frame · linen blend", width: 220, height: 86, color: "Oatmeal" } },
			{ name: "Gather Walnut Dining Set", slug: "gather-walnut-dining-set", sku: "DEMO-FUR-DINING-01", categorySlug: "dining-tables", description: "A welcoming dining table with considered natural-grain detailing, sized for family meals, long conversations, and lasting memories.", price: 74500, stock: 5, image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85", attributes: { material: "Solid walnut wood", width: 180, height: 76, color: "Walnut" } },
		],
	})
	await seedIndustryDemoStore({
		adminUserId: admin.id,
		planId: trialPlan.id,
		industrySlug: "cakes",
		storeName: "Nurava Cakes",
		storeSlug: "nurava-cakes",
		tenantId: "demo-cakes-tenant",
		storeId: "demo-cakes-store",
		products: [
			{ name: "Chocolate Celebration Cake", slug: "chocolate-celebration-cake", sku: "DEMO-CAKE-CHOC-01", categorySlug: "birthday-cakes", description: "A rich cocoa sponge layered with silky chocolate cream and finished by hand. Add your celebration message and finishing notes at checkout.", price: 2800, stock: 20, image: "https://images.unsplash.com/photo-1762267660021-8f501db38ee1?auto=format&fit=crop&w=1200&q=85", attributes: { flavor: "Chocolate", weight: 1, layers: 2 }, variants: [{ name: "Servings", value: "6 slices", priceModifier: 0, stock: 8, sku: "DEMO-CAKE-CHOC-06" }, { name: "Servings", value: "12 slices", priceModifier: 1500, stock: 8, sku: "DEMO-CAKE-CHOC-12" }, { name: "Servings", value: "20 slices", priceModifier: 3200, stock: 4, sku: "DEMO-CAKE-CHOC-20" }] },
			{ name: "Vanilla Berry Layer Cake", slug: "vanilla-berry-layer-cake", sku: "DEMO-CAKE-BERRY-01", categorySlug: "wedding-cakes", description: "Light vanilla layers, berry compote, and smooth cream make a bright centrepiece for showers, anniversaries, and intimate celebrations.", price: 3600, stock: 12, image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=85", attributes: { flavor: "Vanilla", weight: 1.5, layers: 3 }, variants: [{ name: "Servings", value: "6 slices", priceModifier: 0, stock: 4, sku: "DEMO-CAKE-BERRY-06" }, { name: "Servings", value: "12 slices", priceModifier: 1900, stock: 5, sku: "DEMO-CAKE-BERRY-12" }, { name: "Servings", value: "20 slices", priceModifier: 3800, stock: 3, sku: "DEMO-CAKE-BERRY-20" }] },
			{ name: "Little Joy Cupcake Box", slug: "little-joy-cupcake-box", sku: "DEMO-CAKE-CUP-01", categorySlug: "cupcakes", description: "A gift-ready box of soft vanilla and cocoa cupcakes topped with our signature buttercream. Add a note for the baker when you order.", price: 1800, stock: 24, image: "https://images.unsplash.com/photo-1486427944299-d1955d23e34d?auto=format&fit=crop&w=1200&q=85", attributes: { flavor: "Vanilla", weight: 0.6, layers: 1 }, variants: [{ name: "Servings", value: "6 cupcakes", priceModifier: 0, stock: 12, sku: "DEMO-CAKE-CUP-06" }, { name: "Servings", value: "12 cupcakes", priceModifier: 1500, stock: 8, sku: "DEMO-CAKE-CUP-12" }, { name: "Servings", value: "24 cupcakes", priceModifier: 3600, stock: 4, sku: "DEMO-CAKE-CUP-24" }] },
		],
	})
	console.log("✅ Furniture and cake demo stores ready")

	await prisma.deliveryRegion.createMany({
		data: [
			{ tenantId: tenant.id, name: "Nairobi", cost: 200, minDays: 1, maxDays: 2 },
			{ tenantId: tenant.id, name: "Mombasa", cost: 500, minDays: 2, maxDays: 4 },
			{ tenantId: tenant.id, name: "Kisumu", cost: 500, minDays: 2, maxDays: 5 },
			{ tenantId: tenant.id, name: "Nakuru", cost: 400, minDays: 2, maxDays: 3 },
			{ tenantId: tenant.id, name: "Eldoret", cost: 500, minDays: 2, maxDays: 4 },
			{ tenantId: tenant.id, name: "Other", cost: 500, minDays: 3, maxDays: 7 },
		],
	})
	console.log("✅ Delivery regions created")

	await prisma.coupon.createMany({
		data: [
			{
				tenantId: tenant.id,
				code: "TECH10",
				discountPercent: 10,
				minOrderValue: 5000,
				expiresAt: new Date("2025-12-31"),
				usageLimit: 100,
			},
			{
				tenantId: tenant.id,
				code: "WELCOME20",
				discountPercent: 20,
				minOrderValue: 10000,
				expiresAt: new Date("2025-06-30"),
				usageLimit: 50,
			},
			{
				tenantId: tenant.id,
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
