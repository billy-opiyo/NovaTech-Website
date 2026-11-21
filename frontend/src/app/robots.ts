import type { MetadataRoute } from "next"
import { getPlatformDomain } from "backend/lib/platform-domain"

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: "*",
			allow: "/",
		},
		sitemap: `https://${getPlatformDomain()}/sitemap.xml`,
	}
}
