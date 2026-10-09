import { test } from "node:test"
import assert from "node:assert/strict"
import prisma from "../../backend/lib/db"
import { updateProductStock, updateVariantStock } from "../../backend/services/inventory.service"
import { mockPrismaMethod } from "./mock-prisma-method"

test("inventory stock mutations require the resolved tenant", async () => {
	const calls: Array<{ model: string; where: unknown }> = []
	const restoreProductFindFirst = mockPrismaMethod(prisma.product, "findFirst", async ({ where }: { where: unknown }) => { calls.push({ model: "product", where }); return { id: "product-a" } })
	const restoreProductUpdate = mockPrismaMethod(prisma.product, "update", async ({ where }: { where: { id: string } }) => ({ id: where.id, stock: 4 }))
	const restoreVariantFindFirst = mockPrismaMethod(prisma.variant, "findFirst", async ({ where }: { where: unknown }) => { calls.push({ model: "variant", where }); return { id: "variant-a" } })
	const restoreVariantUpdate = mockPrismaMethod(prisma.variant, "update", async ({ where }: { where: { id: string } }) => ({ id: where.id, stock: 2 }))
	try {
		await updateProductStock("product-a", "tenant-a", 4)
		await updateVariantStock("variant-a", "tenant-a", 2)
		assert.deepEqual(calls, [
			{ model: "product", where: { id: "product-a", tenantId: "tenant-a" } },
			{ model: "variant", where: { id: "variant-a", tenantId: "tenant-a" } },
		])
	} finally {
		restoreProductFindFirst()
		restoreProductUpdate()
		restoreVariantFindFirst()
		restoreVariantUpdate()
	}
})
