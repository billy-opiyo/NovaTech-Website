import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { getAllTickets, getTicketStats } from "backend/services/support.service"

export async function GET(req: NextRequest) {
	try {
		const session = await getServerSession()
		if (!session?.user) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
		}

		if (!["ADMIN", "SUPERADMIN"].includes(session.user.role)) {
			return NextResponse.json({ message: "Forbidden - Admin access required" }, { status: 403 })
		}

		const searchParams = req.nextUrl.searchParams
		const status = searchParams.get("status") || "All"
		const priority = searchParams.get("priority") || "All"
		const category = searchParams.get("category") || "All"
		const search = searchParams.get("search") || undefined
		const page = parseInt(searchParams.get("page") || "1", 10)
		const limit = parseInt(searchParams.get("limit") || "20", 10)

		if (searchParams.get("stats") === "true") {
			const stats = await getTicketStats()
			return NextResponse.json(stats)
		}

		const result = await getAllTickets({
			status,
			priority,
			category,
			search,
			page,
			limit,
		})

		return NextResponse.json(result)
	} catch (error: any) {
		console.error("Support tickets API error:", error)
		return NextResponse.json(
			{ message: "Failed to fetch tickets", error: error.message },
			{ status: 500 },
		)
	}
}
</arg_value></tool_call>