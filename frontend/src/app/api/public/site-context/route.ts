import { NextResponse } from "next/server"
import { getStoreContext } from "@/lib/store-context.server"

export const dynamic = "force-dynamic"

export async function GET() {
	const context = await getStoreContext()
	return NextResponse.json(
		{ context },
		{ headers: { "Cache-Control": "no-store, max-age=0" } },
	)
}
