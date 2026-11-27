import { revalidateTag, unstable_cache } from "next/cache"
import prisma from "backend/lib/db"

function blogTag(scopeKey: string) {
	return `public-blog:${scopeKey}`
}

export async function getCachedPublishedBlogPosts(scopeKey: string, tenantId: string | null) {
	return unstable_cache(
		() => prisma.blogPost.findMany({
			where: { scopeKey, tenantId, status: "PUBLISHED", publishedAt: { not: null } },
			select: { id: true, title: true, slug: true, excerpt: true, coverImageUrl: true, publishedAt: true },
			orderBy: { publishedAt: "desc" },
		}),
		["public-blog-index-v1", scopeKey, tenantId || "platform"],
		{ revalidate: 60, tags: [blogTag(scopeKey)] },
	)()
}

export async function getCachedPublishedBlogPost(scopeKey: string, tenantId: string | null, slug: string) {
	return unstable_cache(
		() => prisma.blogPost.findFirst({
			where: { scopeKey, tenantId, slug, status: "PUBLISHED", publishedAt: { not: null } },
			select: { title: true, excerpt: true, content: true, coverImageUrl: true, publishedAt: true },
		}),
		["public-blog-post-v1", scopeKey, tenantId || "platform", slug],
		{ revalidate: 60, tags: [blogTag(scopeKey)] },
	)()
}

export function revalidatePublicBlog(scopeKey: string) {
	revalidateTag(blogTag(scopeKey))
}
