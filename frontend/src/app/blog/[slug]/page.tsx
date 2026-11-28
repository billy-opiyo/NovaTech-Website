import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getStoreContext } from "@/lib/store-context.server"
import { getCachedPublishedBlogPost } from "@/lib/public-blog.server"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
	const [store, { slug }] = await Promise.all([getStoreContext(), params])
	const post = await getCachedPublishedBlogPost(store.isPlatformHome ? "platform" : store.tenantId, store.isPlatformHome ? null : store.tenantId, slug)
	if (!post) return { title: "Article not found", robots: { index: false, follow: false } }
	const description = (post.excerpt?.trim() || post.content.trim()).slice(0, 320)
	return { title: post.title, description, openGraph: { type: "article", title: post.title, description, ...(post.coverImageUrl ? { images: [post.coverImageUrl] } : {}) }, twitter: { card: post.coverImageUrl ? "summary_large_image" : "summary", title: post.title, description, ...(post.coverImageUrl ? { images: [post.coverImageUrl] } : {}) } }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
	const [store, { slug }] = await Promise.all([getStoreContext(), params])
	const post = await getCachedPublishedBlogPost(store.isPlatformHome ? "platform" : store.tenantId, store.isPlatformHome ? null : store.tenantId, slug)
	if (!post) notFound()
	return <main className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6"><article><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{store.isPlatformHome ? store.platformBrandName : store.brand.name}</p><h1 className="mt-2 text-4xl font-bold">{post.title}</h1><time className="mt-3 block text-sm text-gray-500">{post.publishedAt?.toLocaleDateString()}</time>{post.coverImageUrl && <img src={post.coverImageUrl} alt="" className="mt-6 max-h-[32rem] w-full rounded-2xl object-cover" />}<p className="mt-6 text-lg font-medium text-gray-700 dark:text-gray-200">{post.excerpt}</p><div className="mt-6 whitespace-pre-wrap leading-8 text-gray-700 dark:text-gray-300">{post.content}</div></article></main>
}
