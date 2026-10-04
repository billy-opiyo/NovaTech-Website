import { NextRequest, NextResponse } from "next/server"
import { getPublishedStores, getStorePublicUrl } from "@/lib/store-directory.server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
	const query = request.nextUrl.searchParams.get("q")?.trim().toLocaleLowerCase() || ""
	if (!query) return NextResponse.json({ stores: [] }, { headers: { "Cache-Control": "no-store, max-age=0" } })

	const matches = (await getPublishedStores())
		.filter((store) => `${store.name} ${store.slug} ${store.tagline}`.toLocaleLowerCase().includes(query))
		.slice(0, 6)
	const stores = await Promise.all(matches.map(async (store) => ({
		name: store.name,
		tagline: store.tagline,
		href: await getStorePublicUrl(store.slug),
	})))

	return NextResponse.json({ stores }, { headers: { "Cache-Control": "no-store, max-age=0" } })
}
