import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "backend/lib/db"
import { resolveTenantFromRequest } from "backend/lib/tenant"
import { requireStorePermission } from "backend/lib/tenant-access"
import { assertTenantProductLimit } from "backend/billing/subscription"
import { parseCsv, type CatalogCsvRow } from "backend/lib/catalog-csv"
import { getStoreIndustry, normalizeIndustryAttributeInputs, normalizeIndustryAttributeRecord } from "backend/lib/industry"
import { createActionRecord } from "backend/actions"
import { apiErrorResponse } from "backend/lib/api-handler"

const MAX_ROWS = 500
const REQUIRED = ["name", "description", "brand", "sku", "price", "stock", "category", "images"]

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 190) }
function bool(value: string) { return ["true", "1", "yes", "y"].includes(value.trim().toLowerCase()) }
function number(value: string, name: string, integer = false) { const parsed = Number(value); if (!Number.isFinite(parsed) || (integer && !Number.isInteger(parsed))) throw new Error(`${name} must be a valid ${integer ? "whole " : ""}number`) ; return parsed }

function parseAttributes(row: CatalogCsvRow): Record<string, unknown> | undefined {
	if (!Object.prototype.hasOwnProperty.call(row, "attributes")) return undefined
	if (!row.attributes.trim()) return {}
	try {
		const parsed: unknown = JSON.parse(row.attributes)
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error()
		return parsed as Record<string, unknown>
	} catch {
		throw new Error("attributes must be a JSON object using industry attribute keys")
	}
}

function parseRow(row: CatalogCsvRow, rowNumber: number, categories: Map<string, string>, isElectronics: boolean) {
	for (const field of REQUIRED) if (!row[field]?.trim()) throw new Error(`Missing ${field}`)
	const name = row.name.trim()
	const slug = (row.slug || slugify(name)).trim()
	if (!/^[a-z0-9-]{3,200}$/.test(slug)) throw new Error("slug must contain only lowercase letters, numbers, and hyphens")
	const categoryId = categories.get(row.category.trim().toLowerCase())
	if (!categoryId) throw new Error(`Category '${row.category}' was not found in this store`)
	const images = row.images.split("|").map((image) => image.trim()).filter(Boolean)
	if (!images.length || images.some((image) => !/^https?:\/\//i.test(image))) throw new Error("images must contain one or more http(s) URLs separated by |")
	const price = number(row.price, "price")
	if (price <= 0) throw new Error("price must be positive")
	const stock = number(row.stock, "stock", true)
	if (stock < 0) throw new Error("stock cannot be negative")
	const discountedPrice = row.discountedPrice?.trim() ? number(row.discountedPrice, "discountedPrice") : null
	if (discountedPrice !== null && discountedPrice <= 0) throw new Error("discountedPrice must be positive")
	if (discountedPrice !== null && discountedPrice > price) throw new Error("discountedPrice cannot exceed price")
	let specs: Record<string, string> | undefined
	if (!isElectronics && (row.warranty?.trim() || row.specs?.trim())) throw new Error("Warranty and legacy specifications are only available for Electronics stores. Use the attributes column for this store's product details.")
	if (isElectronics && row.specs?.trim()) { try { const parsed = JSON.parse(row.specs); if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error(); specs = Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, String(value)])) } catch { throw new Error("specs must be a JSON object") } }
	let variants: Array<{ name: string; value: string; priceModifier?: number; stock?: number; sku?: string }> | undefined
	if (row.variants?.trim()) {
		try {
			const parsed = JSON.parse(row.variants)
			if (!Array.isArray(parsed)) throw new Error()
			variants = parsed.map((variant) => ({ name: String(variant.name || "").trim(), value: String(variant.value || "").trim(), priceModifier: variant.priceModifier == null ? undefined : Number(variant.priceModifier), stock: variant.stock == null ? undefined : Number(variant.stock), sku: variant.sku ? String(variant.sku) : undefined }))
			if (variants.some((variant) => !variant.name || !variant.value || (variant.priceModifier !== undefined && !Number.isFinite(variant.priceModifier)) || (variant.stock !== undefined && (!Number.isInteger(variant.stock) || variant.stock < 0)))) throw new Error()
		} catch { throw new Error("variants must be a valid JSON array with non-negative stock") }
	}
	return { rowNumber, name, slug, description: row.description.trim(), brand: row.brand.trim(), sku: row.sku.trim(), price, discountedPrice, stock, ...(isElectronics ? { warranty: row.warranty?.trim() || null, specs } : {}), categoryId, images, isFeatured: bool(row.isFeatured || ""), isNewArrival: bool(row.isNewArrival || ""), isTrending: bool(row.isTrending || ""), variants, attributes: parseAttributes(row) }
}

export async function POST(request: NextRequest) {
	try {
		const session = await auth()
		if (!session?.user?.id) return NextResponse.json({ message: "Authentication required" }, { status: 401 })
		const context = await resolveTenantFromRequest(request, { allowUnpublished: true })
		await requireStorePermission(session.user.id, context.tenantId, "MANAGE_CATALOG")
		const form = await request.formData()
		const file = form.get("file")
		const mode = form.get("mode") === "commit" ? "commit" : "preview"
		if (!(file instanceof File)) return NextResponse.json({ message: "Upload a CSV catalog file." }, { status: 400 })
		if (file.size > 2 * 1024 * 1024) return NextResponse.json({ message: "Catalog CSV files are limited to 2MB." }, { status: 400 })
		const rows = parseCsv(await file.text())
		if (!rows.length) return NextResponse.json({ message: "The CSV contains no product rows." }, { status: 400 })
		if (rows.length > MAX_ROWS) return NextResponse.json({ message: `Import up to ${MAX_ROWS} rows at a time.` }, { status: 400 })
		const [categories, storeIndustry] = await Promise.all([
			prisma.category.findMany({ where: { tenantId: context.tenantId, storeId: context.storeId }, select: { id: true, name: true, slug: true } }),
			getStoreIndustry(context.storeId, context.tenantId),
		])
		const definitions = storeIndustry?.industry?.attributeDefinitions ?? []
		const isElectronics = storeIndustry?.industry?.slug === "electronics"
		const categoryMap = new Map(categories.flatMap((category) => [[category.name.toLowerCase(), category.id], [category.slug.toLowerCase(), category.id]]))
		const seenSkus = new Set<string>()
		const parsedRows: Array<ReturnType<typeof parseRow>> = []
		const errors: Array<{ row: number; message: string }> = []
		rows.forEach((row, index) => { try { const parsed = parseRow(row, index + 2, categoryMap, isElectronics); if (seenSkus.has(parsed.sku)) throw new Error("duplicate SKU in this file"); seenSkus.add(parsed.sku); parsedRows.push(parsed) } catch (error: unknown) { errors.push({ row: index + 2, message: error instanceof Error ? error.message : "Invalid row" }) } })
		const existing = await prisma.product.findMany({
			where: { tenantId: context.tenantId, storeId: context.storeId, sku: { in: parsedRows.map((row) => row.sku) } },
			select: { id: true, sku: true, attributeValues: { select: { definitionId: true, value: true } } },
		})
		const existingBySku = new Map(existing.map((product) => [product.sku, product]))
		const valid: Array<ReturnType<typeof parseRow> & { normalizedAttributes: ReturnType<typeof normalizeIndustryAttributeInputs>; replaceAttributes: boolean }> = []
		for (const row of parsedRows) {
			try {
				const current = existingBySku.get(row.sku)
				const normalizedAttributes = row.attributes !== undefined
					? normalizeIndustryAttributeRecord(definitions, row.attributes)
					: normalizeIndustryAttributeInputs(definitions, current
						? current.attributeValues.filter((attribute) => definitions.some((definition) => definition.id === attribute.definitionId)).map(({ definitionId, value }) => ({ definitionId, value }))
						: [])
				valid.push({ ...row, normalizedAttributes, replaceAttributes: row.attributes !== undefined })
			} catch (error: unknown) {
				errors.push({ row: row.rowNumber, message: error instanceof Error ? error.message : "Invalid industry attributes" })
			}
		}
		const existingSkus = new Set(existingBySku.keys())
		const summary = { rows: rows.length, valid: valid.length, invalid: errors.length, creates: valid.filter((row) => !existingSkus.has(row.sku)).length, updates: valid.filter((row) => existingSkus.has(row.sku)).length }
		if (mode === "preview") return NextResponse.json({ mode, summary, errors, sample: valid.slice(0, 10).map((row) => {
			const { normalizedAttributes, ...previewRow } = row
			return {
				...Object.fromEntries(Object.entries(previewRow).filter(([key]) => key !== "replaceAttributes")),
				attributes: Object.fromEntries(normalizedAttributes.map((attribute) => [definitions.find((definition) => definition.id === attribute.definitionId)?.key || attribute.definitionId, attribute.value]))
			}
		}) })
		let created = 0; let updated = 0
		for (const row of valid) {
			try {
				const current = existingBySku.get(row.sku)
				await prisma.$transaction(async (transaction) => {
					if (current) {
						await transaction.product.update({ where: { id: current.id }, data: { name: row.name, slug: row.slug, description: row.description, brand: row.brand, price: row.price, discountedPrice: row.discountedPrice, stock: row.stock, ...(isElectronics ? { warranty: row.warranty, specs: row.specs } : {}), categoryId: row.categoryId, images: row.images, isFeatured: row.isFeatured, isNewArrival: row.isNewArrival, isTrending: row.isTrending } })
						if (row.replaceAttributes) {
							await transaction.productAttributeValue.deleteMany({ where: { productId: current.id } })
							if (row.normalizedAttributes.length) await transaction.productAttributeValue.createMany({ data: row.normalizedAttributes.map((attribute) => ({ productId: current.id, definitionId: attribute.definitionId, value: attribute.value, displayValue: attribute.displayValue })) })
						}
					} else {
						await assertTenantProductLimit(context.tenantId)
						const product = await transaction.product.create({ data: { tenantId: context.tenantId, storeId: context.storeId, name: row.name, slug: row.slug, description: row.description, brand: row.brand, sku: row.sku, price: row.price, discountedPrice: row.discountedPrice, stock: row.stock, ...(isElectronics ? { warranty: row.warranty, specs: row.specs } : {}), categoryId: row.categoryId, images: row.images, isFeatured: row.isFeatured, isNewArrival: row.isNewArrival, isTrending: row.isTrending, variants: row.variants ? { create: row.variants.map((variant) => ({ tenantId: context.tenantId, ...variant })) } : undefined } })
						if (row.normalizedAttributes.length) await transaction.productAttributeValue.createMany({ data: row.normalizedAttributes.map((attribute) => ({ productId: product.id, definitionId: attribute.definitionId, value: attribute.value, displayValue: attribute.displayValue })) })
					}
				})
				if (current) updated += 1
				else created += 1
			} catch (error: unknown) { errors.push({ row: row.rowNumber, message: error instanceof Error ? error.message : "Database rejected this row" }) }
		}
		await createActionRecord("IMPORTED_CATALOG", { tenantId: context.tenantId, adminId: session.user.id, fileName: file.name, rows: rows.length, created, updated, failed: errors.length }).catch(() => undefined)
		return NextResponse.json({ mode, summary: { ...summary, created, updated, failed: errors.length }, errors })
	} catch (error: unknown) { return apiErrorResponse(error, "Catalog import unavailable") }
}
