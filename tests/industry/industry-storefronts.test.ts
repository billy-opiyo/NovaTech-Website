import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { defaultCategoryImage, defaultIndustryHomepage } from "../../backend/lib/industry-content"
import { cakeCustomizationsSchema, normalizeIndustryCustomizations } from "../../backend/lib/cake-customizations"
import { DEMO_STORE_WHATSAPP_NUMBER, resolveStoreWhatsAppNumber } from "../../frontend/src/lib/demo-store-config"
import { getProductEnquiryTopics, getProductSupportDescription } from "../../frontend/src/lib/industry-copy"
import { getProductSpecsWithAttributes } from "../../frontend/src/lib/product-specs"

test("industry homepage defaults provide relevant copy without hero artwork", () => {
	const furniture = defaultIndustryHomepage({ name: "Furniture", slug: "furniture" })
	const cakes = defaultIndustryHomepage({ name: "Cake Shop", slug: "cakes" })
	const futureIndustry = defaultIndustryHomepage({ name: "Florist", slug: "florist" })
	assert.match(String(furniture.heroDescription), /furniture|home/i)
	assert.match(String(cakes.heroDescription), /cake|bake/i)
	assert.match(String(futureIndustry.heroTitle), /Florist/)
	assert.equal("heroImage" in furniture, false)
	assert.equal("heroImageAlt" in cakes, false)
	assert.equal("heroImage" in futureIndustry, false)
	assert.equal("heroImage" in defaultIndustryHomepage({ name: "Furniture", slug: "furniture" }, { heroImage: "https://example.com/old-hero.jpg", heroImageAlt: "Legacy" }), false)
})

test("category defaults select artwork by industry and category instead of blank placeholders", () => {
	assert.match(defaultCategoryImage("furniture", "Sofas"), /images\.unsplash\.com/)
	assert.match(defaultCategoryImage("cakes", "Cupcakes"), /images\.unsplash\.com/)
	const weddingImage = "https://images.unsplash.com/photo-1676734626918-b0663902259f?auto=format&fit=crop&w=1000&q=80"
	assert.equal(defaultCategoryImage("cakes", "Wedding Cakes"), weddingImage)
	assert.equal(defaultCategoryImage("cakes", "Wedding Cakes", "https://images.unsplash.com/photo-1519655272701-6c23d7e9ad40?auto=format&fit=crop&w=1000&q=80"), weddingImage)
	assert.equal(defaultCategoryImage("furniture", "Beds", "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85"), "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85")
})

test("only the demo furniture and cake stores use the explicitly approved WhatsApp fallback", () => {
	assert.equal(resolveStoreWhatsAppNumber("nurava-cakes", ""), DEMO_STORE_WHATSAPP_NUMBER)
	assert.equal(resolveStoreWhatsAppNumber("nurava-furnitures", undefined), DEMO_STORE_WHATSAPP_NUMBER)
	assert.equal(resolveStoreWhatsAppNumber("merchant-store", ""), "")
	assert.equal(resolveStoreWhatsAppNumber("nurava-cakes", "254711111111"), "254711111111")
})

test("industry support and enquiry copy avoids irrelevant electronics wording", () => {
	assert.match(getProductEnquiryTopics("cakes"), /flavours.*servings.*preparation/i)
	assert.doesNotMatch(getProductEnquiryTopics("cakes"), /warranty/i)
	assert.match(getProductSupportDescription("furniture"), /materials.*dimensions.*assembly/i)
	assert.doesNotMatch(getProductSupportDescription("furniture"), /warranty/i)
})

test("warranty controls and deal copy respect the active storefront industry", () => {
	const productManager = readFileSync("frontend/src/components/manage/ManageProductsPage.tsx", "utf8")
	const dealsPage = readFileSync("frontend/src/app/deals/page.tsx", "utf8")
	const cartPage = readFileSync("frontend/src/app/cart/page.tsx", "utf8")
	const contactPage = readFileSync("frontend/src/app/contact/page.tsx", "utf8")
	assert.match(productManager, /industry\?\.slug === "electronics" && <label className="text-sm">Warranty/)
	assert.match(dealsPage, /getProductSupportDescription\(store\.industry\?\.slug\)/)
	assert.doesNotMatch(dealsPage, /Store-managed warranty/)
	assert.match(cartPage, /getProductSupportDescription\(store\.industry\?\.slug\)/)
	assert.match(contactPage, /store\.industry\?\.slug === "electronics" && <option value="warranty">Warranty Claim/)
})

test("product comparison includes industry-defined attributes such as cake flavour and furniture dimensions", () => {
	assert.deepEqual(getProductSpecsWithAttributes({ Weight: "1 kg" }, [
		{ definition: { name: "Flavor", key: "flavor" }, displayValue: "Vanilla" },
		{ definition: { name: "Layers", key: "layers" }, value: 3 },
	]), { Weight: "1 kg", Flavor: "Vanilla", Layers: 3 })
})

test("cake customizations accept only bounded per-order preferences", () => {
	const customizations = { message: "Happy birthday, Amina", icing: "chocolate-buttercream", eventDate: "2026-12-01", dietaryNotes: "No peanuts" }
	assert.equal(cakeCustomizationsSchema.safeParse(customizations).success, true)
	assert.equal(cakeCustomizationsSchema.safeParse({}).success, false)
	assert.equal(cakeCustomizationsSchema.safeParse({ message: "x".repeat(51) }).success, false)
	assert.throws(() => normalizeIndustryCustomizations("furniture", customizations), /only available in cake stores/)
	assert.deepEqual(normalizeIndustryCustomizations("cakes", customizations), customizations)
})
