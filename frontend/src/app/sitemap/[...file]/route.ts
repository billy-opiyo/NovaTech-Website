import { getSitemapXml, sitemapCacheHeaders } from "@/lib/sitemap"

export const dynamic = "force-dynamic"

export async function GET(_request: Request, { params }: { params: Promise<{ file: string[] }> }) {
	const { file } = await params
	const match = file.length === 1 ? /^(\d+)\.xml$/.exec(file[0]) : null
	if (!match) return new Response("Not found", { status: 404 })
	const body = await getSitemapXml(Number(match[1]))
	return new Response(body, { headers: sitemapCacheHeaders() })
}
