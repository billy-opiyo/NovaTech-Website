import { test } from "node:test"
import assert from "node:assert/strict"
import { defaultCategoryImage, defaultIndustryHomepage } from "../../backend/lib/industry-content"
import { cakeCustomizationsSchema, normalizeIndustryCustomizations } from "../../backend/lib/cake-customizations"

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
	assert.equal(defaultCategoryImage("furniture", "Beds", "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85"), "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85")
})

test("cake customizations accept only bounded per-order preferences", () => {
	const customizations = { message: "Happy birthday, Amina", icing: "chocolate-buttercream", eventDate: "2026-12-01", dietaryNotes: "No peanuts" }
	assert.equal(cakeCustomizationsSchema.safeParse(customizations).success, true)
	assert.equal(cakeCustomizationsSchema.safeParse({}).success, false)
	assert.equal(cakeCustomizationsSchema.safeParse({ message: "x".repeat(51) }).success, false)
	assert.throws(() => normalizeIndustryCustomizations("furniture", customizations), /only available in cake stores/)
	assert.deepEqual(normalizeIndustryCustomizations("cakes", customizations), customizations)
})
