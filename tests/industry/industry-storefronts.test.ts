import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { defaultCategoryImage, defaultIndustryHomepage } from "../../backend/lib/industry-content"
import { cakeCustomizationsSchema, normalizeIndustryCustomizations } from "../../backend/lib/cake-customizations"
import { DEMO_STORE_WHATSAPP_NUMBER, resolveStoreWhatsAppNumber } from "../../frontend/src/lib/demo-store-config"
import { getProductEnquiryTopics, getProductSearchPlaceholder, getProductSupportDescription } from "../../frontend/src/lib/industry-copy"
import { getProductSpecsWithAttributes } from "../../frontend/src/lib/product-specs"
import { getIndustryComparisonFields, getStoreCompareStorageKey } from "../../frontend/src/lib/industry-compare"
import { getStoreDesignDraftStorageKey } from "../../frontend/src/lib/store-design-draft"

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

test("the industry demo stores use the explicitly approved shared WhatsApp fallback", () => {
	assert.equal(resolveStoreWhatsAppNumber("nurava-cakes", ""), DEMO_STORE_WHATSAPP_NUMBER)
	assert.equal(resolveStoreWhatsAppNumber("nurava-furnitures", undefined), DEMO_STORE_WHATSAPP_NUMBER)
	assert.equal(resolveStoreWhatsAppNumber("nurava-boutiques", undefined), DEMO_STORE_WHATSAPP_NUMBER)
	assert.equal(resolveStoreWhatsAppNumber("merchant-store", ""), "")
	assert.equal(resolveStoreWhatsAppNumber("nurava-cakes", "254711111111"), "254711111111")
})

test("industry support and enquiry copy avoids irrelevant electronics wording", () => {
	assert.match(getProductEnquiryTopics("cakes"), /flavours.*servings.*preparation/i)
	assert.doesNotMatch(getProductEnquiryTopics("cakes"), /warranty/i)
	assert.match(getProductSupportDescription("furniture"), /materials.*dimensions.*assembly/i)
	assert.doesNotMatch(getProductSupportDescription("furniture"), /warranty/i)
})

test("boutique search, enquiry, and support copy is tailored to apparel and accessories", () => {
	assert.match(getProductSearchPlaceholder("boutiques"), /clothing.*shoes.*sizes.*colours/i)
	assert.match(getProductEnquiryTopics("boutiques"), /sizes.*fit.*colours.*materials/i)
	assert.match(getProductSupportDescription("boutiques"), /sizing.*fit.*colours.*materials/i)
	assert.doesNotMatch(`${getProductSearchPlaceholder("boutiques")} ${getProductEnquiryTopics("boutiques")} ${getProductSupportDescription("boutiques")}`, /laptop|processor|warranty|electronics/i)
})

test("comparison fields match all four supported store industries", () => {
	assert.deepEqual(getIndustryComparisonFields("electronics"), ["Processor", "RAM", "Storage", "Display", "Battery", "Camera", "OS", "Weight", "GPU", "Ports"])
	assert.deepEqual(getIndustryComparisonFields("cakes"), ["Flavor", "Weight", "Layers", "Servings", "Dietary details"])
	assert.deepEqual(getIndustryComparisonFields("furniture"), ["Material", "Width", "Height", "Depth", "Color", "Finish"])
	const boutiqueFields = getIndustryComparisonFields("boutiques")
	assert.deepEqual(boutiqueFields, ["For", "Available clothing sizes", "Available shoe sizes", "Color", "Material"])
	assert.doesNotMatch(boutiqueFields.join(" "), /Processor|RAM|Camera|GPU|Ports/)
	assert.deepEqual(getIndustryComparisonFields("florist"), ["Brand", "Category", "Availability"])
})

test("comparison selections and offline design drafts are isolated by store", () => {
	assert.equal(getStoreCompareStorageKey("store-a"), "compare:store-a")
	assert.notEqual(getStoreCompareStorageKey("store-a"), getStoreCompareStorageKey("store-b"))
	assert.notEqual(getStoreCompareStorageKey("electronics-a"), "novatech-compare")
	assert.equal(getStoreDesignDraftStorageKey("store-a"), "nurava-store-design-draft:store-a")
	assert.notEqual(getStoreDesignDraftStorageKey("store-a"), getStoreDesignDraftStorageKey("store-b"))
})

test("boutique contact and FAQ pages offer store-specific apparel guidance", () => {
	const contactPage = readFileSync("frontend/src/app/contact/page.tsx", "utf8")
	const faqsPage = readFileSync("frontend/src/app/faqs/page.tsx", "utf8")
	assert.match(contactPage, /industrySlug === "boutiques"[\s\S]*Clothing & Style[\s\S]*size or fit/i)
	assert.match(faqsPage, /industrySlug === "boutiques"[\s\S]*size or fit[\s\S]*colours and materials/i)
})

test("merchant onboarding never disguises an industry API failure as electronics-only availability", () => {
	const onboardingPage = readFileSync("frontend/src/app/onboarding/page.tsx", "utf8")
	assert.match(onboardingPage, /industriesError/)
	assert.match(onboardingPage, /Choose an available industry before creating the store/)
	assert.match(onboardingPage, /options\.find\(\(industry\) => industry\.slug === "electronics"\)/)
	assert.doesNotMatch(onboardingPage, /setIndustries\(\[\{ id: "electronics-fallback"/)
})

test("checkout reuses a PII-free hashed idempotency key across reloads and clears it after success", () => {
	const checkoutPage = readFileSync("frontend/src/app/checkout/page.tsx", "utf8")
	assert.match(checkoutPage, /crypto\.subtle\.digest\("SHA-256"/)
	assert.match(checkoutPage, /sessionStorage\.getItem\(storageKey\)/)
	assert.match(checkoutPage, /sessionStorage\.setItem\(storageKey, key\)/)
	assert.match(checkoutPage, /sessionStorage\.removeItem\(orderAttempt\.current\.storageKey\)/)
	assert.doesNotMatch(checkoutPage, /Idempotency-Key": crypto\.randomUUID\(\)/)
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
