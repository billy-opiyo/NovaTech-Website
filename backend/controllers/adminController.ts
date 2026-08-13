import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import prisma from "../lib/db"
import { createActionRecord } from "../actions"

function isAdmin(role?: string) {
	return role === "ADMIN" || role === "SUPERADMIN"
}

export async function getAdminLogs(req: NextRequest) {
	try {
		const session = await getServerSession()
		if (!session?.user || !isAdmin(session.user.role)) {
			return NextResponse.json({ message: "Forbidden" }, { status: 403 })
		}

		const searchParams = req.nextUrl.searchParams
		const page = parseInt(searchParams.get("page") || "1", 10)
		const limit = parseInt(searchParams.get("limit") || "20", 10)
		const action = searchParams.get("action") || undefined
		const adminId = searchParams.get("adminId") || undefined

		const where: any = {}
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
		return NextResponse.json(
			{ message: "Failed to fetch admin logs", error: error.message },
			{ status: 500 },
		)
	}
}

export async function getAdminLogStats() {
	try {
		const session = await getServerSession()
		if (!session?.user || !isAdmin(session.user.role)) {
			return NextResponse.json({ message: "Forbidden" }, { status: 403 })
		}

		const [totalLogs, todayLogs, recentActions] = await Promise.all([
			prisma.adminLog.count(),
			prisma.adminLog.count({
				where: {
					createdAt: {
						gte: new Date(new Date().setHours(0, 0, 0, 0)),
					},
				},
			}),
			prisma.adminLog.groupBy({
				by: ["action"],
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
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}

export async function recordAdminAction(req: NextRequest) {
	try {
		const session = await getServerSession()
		if (!session?.user || !isAdmin(session.user.role)) {
			return NextResponse.json({ message: "Forbidden" }, { status: 403 })
		}

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
		})

		return NextResponse.json(result, { status: 201 })
	} catch (error: any) {
		return NextResponse.json({ message: error.message }, { status: 500 })
	}
}
