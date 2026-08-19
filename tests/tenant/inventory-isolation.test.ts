import { test } from "node:test"
import assert from "node:assert/strict"
import prisma from "../../backend/lib/db"
import { updateProductStock, updateVariantStock } from "../../backend/services/inventory.service"

test("inventory stock mutations require the resolved tenant", async () => {
	const productFindFirst = prisma.product.findFirst
	const productUpdate = prisma.product.update
	const variantFindFirst = prisma.variant.findFirst
	const variantUpdate = prisma.variant.update
	const calls: Array<{ model: string; where: unknown }> = []
	;(prisma.product.findFirst as any) = async ({ where }: any) => { calls.push({ model: "product", where }); return { id: "product-a" } }
	;(prisma.product.update as any) = async ({ where }: any) => ({ id: where.id, stock: 4 })
	;(prisma.variant.findFirst as any) = async ({ where }: any) => { calls.push({ model: "variant", where }); return { id: "variant-a" } }
	;(prisma.variant.update as any) = async ({ where }: any) => ({ id: where.id, stock: 2 })
	try {
		await updateProductStock("product-a", "tenant-a", 4)
		await updateVariantStock("variant-a", "tenant-a", 2)
		assert.deepEqual(calls, [
			{ model: "product", where: { id: "product-a", tenantId: "tenant-a" } },
			{ model: "variant", where: { id: "variant-a", tenantId: "tenant-a" } },
		])
	} finally {
		;(prisma.product.findFirst as any) = productFindFirst
		;(prisma.product.update as any) = productUpdate
		;(prisma.variant.findFirst as any) = variantFindFirst
		;(prisma.variant.update as any) = variantUpdate
	}
})
