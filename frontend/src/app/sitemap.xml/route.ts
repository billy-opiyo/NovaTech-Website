import { getSitemapIndexXml, getSitemapRanges, sitemapCacheHeaders } from "@/lib/sitemap"

export const dynamic = "force-dynamic"

export async function GET() {
	try {
		const ranges = await getSitemapRanges()
		const pageCount = ranges.reduce((total, range) => total + range.pages, 0)
		return new Response(getSitemapIndexXml(pageCount), { headers: sitemapCacheHeaders() })
	} catch (error) {
		console.error("Sitemap index counts unavailable; publishing the fixed sitemap only", error)
		return new Response(getSitemapIndexXml(0), { headers: sitemapCacheHeaders() })
	}
}
