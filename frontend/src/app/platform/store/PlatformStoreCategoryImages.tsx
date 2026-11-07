"use client"

type Category = { slug: string; name: string; imageUrl: string | null; industry: { name: string; slug: string } | null }

export default function PlatformStoreCategoryImages({ categories, images, disabled, upload, remove }: { categories: Category[]; images: Record<string, string>; disabled: boolean; upload: (file: File | undefined, slug: string) => void; remove: (slug: string) => void }) {
	return <section className="space-y-3 rounded-xl border p-4"><div><h4 className="font-semibold">Category card images</h4><p className="mt-1 text-xs text-gray-500">Upload a custom image for each category card. Leave it empty to use its industry CMS image.</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{categories.map((category) => {
		const key = `${category.industry?.slug || "general"}:${category.slug}`
		const image = images[key] || category.imageUrl
		return <article key={key} className="flex items-center gap-3 rounded-lg border p-3"><div className="h-16 w-20 shrink-0 overflow-hidden rounded bg-gray-100 dark:bg-white/5">{image && <img src={image} alt={`${category.name} category preview`} className="h-full w-full object-cover"/>}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{category.name}</p><p className="truncate text-xs text-gray-500">{category.industry?.name || "Industry"}</p><div className="mt-2 flex flex-wrap gap-2"><label className="inline-flex cursor-pointer rounded border px-2 py-1 text-xs">Upload image<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={disabled} onChange={(event) => { upload(event.target.files?.[0], key); event.target.value = "" }}/></label>{images[key] && <button type="button" disabled={disabled} onClick={() => remove(key)} className="rounded border px-2 py-1 text-xs">Use default</button>}</div></div></article>
	})}</div>{!categories.length && <p className="text-sm text-gray-500">Provision active categories in Industry CMS before customizing their images.</p>}</section>
}
