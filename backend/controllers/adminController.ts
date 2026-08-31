import { NextRequest, NextResponse } from "next/server"
import prisma from "../lib/db"
import { createActionRecord } from "../actions"
import { MembershipRole } from "@prisma/client"
import { requireStoreAccess } from "../lib/store-access"
import { parsePagination } from "../lib/pagination"
import { apiErrorResponse } from "../lib/api-handler"

export async function getAdminLogs(req: NextRequest) {
	try {
		const { context } = await requireStoreAccess(req, [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN])

		const searchParams = req.nextUrl.searchParams
		const { page, limit } = parsePagination(searchParams)
		const action = searchParams.get("action") || undefined
		const adminId = searchParams.get("adminId") || undefined

		const where: any = { tenantId: context.tenantId }
		if (action) where.action = action
		if (adminId) where.adminId = adminId

		const [logs, total] = await Promise.all([
			prisma.adminLog.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip: (page - 1) * limit,
				take: limit,
				include: {
					admin: {
						select: {
							name: true,
							email: true,
						},
					},
				},
			}),
			prisma.adminLog.count({ where }),
		])

		// Get distinct actions for filter UI
		const distinctActions = await prisma.adminLog.findMany({
			where: { tenantId: context.tenantId },
			distinct: ["action"],
			select: { action: true },
		})

		return NextResponse.json({
			logs,
			total,
			page,
			totalPages: Math.ceil(total / limit),
			actions: distinctActions.map((a: { action: string }) => a.action),
		})
	} catch (error: any) {
		console.error("Admin logs API error:", error)
		return apiErrorResponse(error, "Failed to fetch admin logs")
	}
}

export async function getAdminLogStats(req: NextRequest) {
	try {
		const { context } = await requireStoreAccess(req, [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN])

		const [totalLogs, todayLogs, recentActions] = await Promise.all([
			prisma.adminLog.count({ where: { tenantId: context.tenantId } }),
			prisma.adminLog.count({
				where: {
					tenantId: context.tenantId,
					createdAt: {
						gte: new Date(new Date().setHours(0, 0, 0, 0)),
					},
				},
			}),
			prisma.adminLog.groupBy({
				by: ["action"],
				where: { tenantId: context.tenantId },
				_count: { _all: true },
				orderBy: { _count: { action: "desc" } },
				take: 10,
			}),
		])

		return NextResponse.json({
			totalLogs,
			todayLogs,
			mostCommonActions: recentActions,
		})
	} catch (error: any) {
		return apiErrorResponse(error, "Admin log statistics unavailable")
	}
}

export async function recordAdminAction(req: NextRequest) {
	try {
		const { context, session } = await requireStoreAccess(req, [MembershipRole.STORE_OWNER, MembershipRole.STORE_ADMIN])

		const body = await req.json()
		const { action, metadata } = body

		if (!action || typeof action !== "string") {
			return NextResponse.json(
				{ message: "action is required and must be a string" },
				{ status: 400 },
			)
		}

		const result = await createActionRecord(action, {
			...metadata,
			adminId: session.user.id,
			tenantId: context.tenantId,
		})

		return NextResponse.json(result, { status: 201 })
	} catch (error: any) {
		return apiErrorResponse(error, "Unable to record admin action")
	}
}
