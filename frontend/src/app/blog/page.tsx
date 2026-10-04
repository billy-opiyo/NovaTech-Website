import Link from "next/link"
import prisma from "backend/lib/db"
import { getStoreContext } from "@/lib/store-context.server"
import { getStoreRouteHref } from "@/lib/store-home"

export const dynamic = "force-dynamic"

export default async function BlogPage() {
	const store = await getStoreContext()
	const posts = await prisma.blogPost.findMany({
		where: { scopeKey: store.isPlatformHome ? "platform" : store.tenantId, tenantId: store.isPlatformHome ? null : store.tenantId, status: "PUBLISHED", publishedAt: { not: null } },
		select: { id: true, title: true, slug: true, excerpt: true, coverImageUrl: true, publishedAt: true },
		orderBy: { publishedAt: "desc" },
	})
	const title = store.isPlatformHome ? "Nurava HubStores Blog" : `${store.brand.name} Blog`
	return <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6"><header><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{store.isPlatformHome ? "Insights and guides" : store.brand.name}</p><h1 className="mt-2 text-4xl font-bold">{title}</h1><p className="mt-3 max-w-2xl text-gray-600 dark:text-gray-300">{store.isPlatformHome ? "Practical tips for choosing, using, and caring for your technology." : `News, buying guides, and updates from ${store.brand.name}.`}</p></header>
		{posts.length ? <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{posts.map((post) => <article key={post.id} className="glass-card flex h-full flex-col overflow-hidden">{post.coverImageUrl && <img src={post.coverImageUrl} alt="" className="aspect-[16/9] w-full rounded-xl object-cover" loading="lazy" />}<div className="flex flex-1 flex-col p-5"><p className="text-xs text-gray-500">{post.publishedAt?.toLocaleDateString()}</p><h2 className="mt-2 text-xl font-semibold">{post.title}</h2><p className="mt-2 line-clamp-4 text-sm text-gray-600 dark:text-gray-300">{post.excerpt}</p><Link href={getStoreRouteHref(store, `/blog/${post.slug}`)} className="mt-auto pt-5 font-semibold text-primary hover:underline">Read article →</Link></div></article>)}</section> : <section className="glass-card p-8 text-center text-gray-500">No articles have been published yet.</section>}
	</main>
}
