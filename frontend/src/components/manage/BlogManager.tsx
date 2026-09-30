"use client"

import { useEffect, useState, type FormEvent } from "react"
import { BookOpen, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react"

type Post = { id: string; title: string; slug: string; excerpt: string; content: string; coverImageUrl: string | null; status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; publishedAt?: string | null; updatedAt?: string }
type Draft = Omit<Post, "id" | "publishedAt" | "updatedAt">
const emptyDraft: Draft = { title: "", slug: "", excerpt: "", content: "", coverImageUrl: "", status: "DRAFT" }
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 180)

export default function BlogManager({ endpoint, heading }: { endpoint: string; heading: string }) {
	const [posts, setPosts] = useState<Post[]>([])
	const [draft, setDraft] = useState<Draft>(emptyDraft)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [slugEdited, setSlugEdited] = useState(false)
	const [busy, setBusy] = useState(false)
	const [message, setMessage] = useState("Loading articles…")

	async function load() {
		const response = await fetch(endpoint, { cache: "no-store" })
		const result = await response.json().catch(() => ({}))
		if (!response.ok) throw new Error(result.message || "Unable to load articles")
		setPosts(result.posts || [])
		setMessage("")
	}
	useEffect(() => { void load().catch((error) => setMessage(error.message)) }, [endpoint])

	function startEdit(post: Post) {
		setEditingId(post.id)
		setSlugEdited(true)
		setDraft({ title: post.title, slug: post.slug, excerpt: post.excerpt, content: post.content, coverImageUrl: post.coverImageUrl || "", status: post.status })
		requestAnimationFrame(() => document.getElementById("blog-post-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }))
	}
	function reset() { setEditingId(null); setDraft(emptyDraft); setSlugEdited(false) }

	async function save(event: FormEvent) {
		event.preventDefault()
		setBusy(true); setMessage("")
		try {
			const response = await fetch(editingId ? `${endpoint}/${editingId}` : endpoint, { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...draft, coverImageUrl: draft.coverImageUrl || null }) })
			const result = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(result.message || "Unable to save article")
			await load(); reset(); setMessage(editingId ? "Article updated." : "Article created.")
		} catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save article") }
		finally { setBusy(false) }
	}

	async function remove(post: Post) {
		if (!window.confirm(`Permanently delete “${post.title}”?`)) return
		setBusy(true); setMessage("")
		try {
			const response = await fetch(`${endpoint}/${post.id}`, { method: "DELETE" })
			const result = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(result.message || "Unable to delete article")
			await load(); setMessage("Article deleted.")
		} catch (error) { setMessage(error instanceof Error ? error.message : "Unable to delete article") }
		finally { setBusy(false) }
	}

	return <div className="space-y-6"><header><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Content management</p><h1 className="mt-2 text-3xl font-bold">{heading}</h1><p className="mt-2 text-gray-500">Write articles, save drafts, and publish or archive them. Only published posts appear on the matching site's public blog.</p></header>
		{message && <p role="status" className="rounded-lg border border-gray-200 p-3 text-sm">{message}</p>}
		<form id="blog-post-editor" onSubmit={save} className="glass-card scroll-mt-24 space-y-4 p-5"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{editingId ? "Edit article" : "New article"}</h2>{editingId && <button type="button" onClick={reset} className="inline-flex items-center gap-1 text-sm"><X size={16}/> Cancel edit</button>}</div>
			<div className="grid gap-4 md:grid-cols-2"><label className="space-y-1 text-sm">Title<input required minLength={3} maxLength={160} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value, slug: slugEdited ? current.slug : slugify(event.target.value) }))} className="w-full rounded-lg border p-3 dark:bg-dark-surface" /></label><label className="space-y-1 text-sm">URL slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={180} value={draft.slug} onChange={(event) => { setSlugEdited(true); setDraft((current) => ({ ...current, slug: slugify(event.target.value) })) }} className="w-full rounded-lg border p-3 dark:bg-dark-surface" /></label></div>
			<label className="block space-y-1 text-sm">Short summary<textarea required minLength={10} maxLength={500} value={draft.excerpt} onChange={(event) => setDraft((current) => ({ ...current, excerpt: event.target.value }))} rows={2} className="w-full rounded-lg border p-3 dark:bg-dark-surface" /></label>
			<label className="block space-y-1 text-sm">Cover image URL (optional)<input type="url" value={draft.coverImageUrl || ""} onChange={(event) => setDraft((current) => ({ ...current, coverImageUrl: event.target.value }))} className="w-full rounded-lg border p-3 dark:bg-dark-surface" placeholder="https://…" /></label>
			<label className="block space-y-1 text-sm">Article body<textarea required minLength={20} maxLength={30000} value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} rows={12} className="w-full rounded-lg border p-3 dark:bg-dark-surface" /></label>
			<div className="flex flex-wrap items-center justify-between gap-3"><label className="space-y-1 text-sm">Publication status<select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as Draft["status"] }))} className="block rounded-lg border p-2 dark:bg-dark-surface"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></label><button disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin"/> : editingId ? <Save size={16}/> : <Plus size={16}/>} {editingId ? "Save changes" : "Create article"}</button></div>
		</form>
		<section className="space-y-3"><h2 className="text-xl font-semibold">Articles ({posts.length})</h2>{posts.length ? posts.map((post) => <article key={post.id} className="glass-card flex flex-wrap items-center justify-between gap-4 p-4"><div className="flex min-w-0 items-start gap-3"><BookOpen className="mt-1 shrink-0 text-primary" size={20}/><div className="min-w-0"><h3 className="font-semibold">{post.title}</h3><p className="mt-1 break-all text-xs text-gray-500">/blog/{post.slug} · {post.status.toLowerCase()}</p><p className="mt-1 line-clamp-2 text-sm text-gray-500">{post.excerpt}</p></div></div><div className="flex shrink-0 gap-2"><button type="button" disabled={busy} onClick={() => startEdit(post)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm"><Pencil size={15}/> Edit</button><button type="button" disabled={busy} onClick={() => void remove(post)} className="destructive-action inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm"><Trash2 size={15}/> Delete</button></div></article>) : <p className="glass-card p-5 text-sm text-gray-500">No articles yet. Create your first draft above.</p>}</section>
	</div>
}
