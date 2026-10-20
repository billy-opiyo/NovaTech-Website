"use client"

import { useCallback, useEffect, useState } from "react"
import { LoaderCircle, Mail, MessageSquareText, RefreshCw, Send } from "lucide-react"

type PlatformMessage = {
	id: string
	customerName: string
	customerEmail: string
	customerPhone: string | null
	subject: string
	description: string
	category: string
	priority: string
	status: string
	createdAt: string
	updatedAt: string
	replies?: Array<{ id: string; reply: string; isAdmin: boolean; createdAt: string }>
}

const statuses = ["ALL", "OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"]

function label(value: string) {
	return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase())
}

export default function PlatformMessagesPanel() {
	const [messages, setMessages] = useState<PlatformMessage[]>([])
	const [selected, setSelected] = useState<PlatformMessage | null>(null)
	const [search, setSearch] = useState("")
	const [status, setStatus] = useState("ALL")
	const [page, setPage] = useState(1)
	const [total, setTotal] = useState(0)
	const [totalPages, setTotalPages] = useState(1)
	const [reply, setReply] = useState("")
	const [loading, setLoading] = useState(true)
	const [loadingDetail, setLoadingDetail] = useState(false)
	const [sending, setSending] = useState(false)
	const [error, setError] = useState("")

	const loadMessages = useCallback(async () => {
		setLoading(true)
		setError("")
		try {
			const params = new URLSearchParams({ status, limit: "50", page: String(page) })
			if (search.trim()) params.set("search", search.trim())
			const response = await fetch(`/api/platform/messages?${params.toString()}`, { cache: "no-store" })
			const data = await response.json()
			if (!response.ok) throw new Error(data.message || "Unable to load platform messages")
			setMessages(data.messages || [])
			setTotal(data.total || 0)
			setTotalPages(Math.max(1, data.totalPages || 1))
		} catch (loadError) {
			setError(loadError instanceof Error ? loadError.message : "Unable to load platform messages")
		} finally {
			setLoading(false)
		}
	}, [page, search, status])

	useEffect(() => {
		const timer = window.setTimeout(() => void loadMessages(), 200)
		return () => window.clearTimeout(timer)
	}, [loadMessages])

	const loadMessage = useCallback(async (id: string) => {
		setLoadingDetail(true)
		setError("")
		try {
			const response = await fetch(`/api/platform/messages/${id}`, { cache: "no-store" })
			const data = await response.json()
			if (!response.ok) throw new Error(data.message || "Unable to load this message")
			setSelected(data)
		} catch (detailError) {
			setError(detailError instanceof Error ? detailError.message : "Unable to load this message")
		} finally {
			setLoadingDetail(false)
		}
	}, [])

	async function sendReply() {
		if (!selected || !reply.trim()) return
		setSending(true)
		setError("")
		try {
			const response = await fetch(`/api/platform/messages/${selected.id}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ reply }),
			})
			const data = await response.json()
			if (!response.ok) throw new Error(data.message || "Unable to send reply")
			setReply("")
			await Promise.all([loadMessage(selected.id), loadMessages()])
		} catch (sendError) {
			setError(sendError instanceof Error ? sendError.message : "Unable to send reply")
		} finally {
			setSending(false)
		}
	}

	async function changeStatus(nextStatus: string) {
		if (!selected) return
		setError("")
		try {
			const response = await fetch(`/api/platform/messages/${selected.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: nextStatus.toLowerCase() }),
			})
			const data = await response.json()
			if (!response.ok) throw new Error(data.message || "Unable to update message status")
			await Promise.all([loadMessage(selected.id), loadMessages()])
		} catch (statusError) {
			setError(statusError instanceof Error ? statusError.message : "Unable to update message status")
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2 className="text-3xl font-bold">Platform messages</h2>
					<p className="mt-2 text-gray-600 dark:text-gray-300">Contact form messages sent to Nurava HubStores support.</p>
				</div>
				<button type="button" onClick={() => void loadMessages()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold hover:bg-black/5 disabled:opacity-50 dark:border-white/10">
					<RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
				</button>
			</div>

			{error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{error}</p>}

			<div className="grid gap-4 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.4fr)]">
				<section className="glass-card min-w-0 overflow-hidden" aria-label="Platform contact messages">
					<div className="space-y-3 border-b border-gray-200 p-4 dark:border-white/10">
						<label className="block">
							<span className="sr-only">Search platform messages</span>
							<input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search messages" className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-white/10" />
						</label>
						<label className="block">
							<span className="sr-only">Filter by status</span>
							<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-white/10">
								{statuses.map((item) => <option key={item} value={item}>{item === "ALL" ? "All statuses" : label(item)}</option>)}
							</select>
						</label>
					</div>
					<div className="max-h-[65vh] overflow-y-auto divide-y divide-gray-200 dark:divide-white/10">
						{loading ? <p className="p-6 text-sm text-gray-500">Loading messages…</p> : messages.map((message) => (
							<button key={message.id} type="button" onClick={() => void loadMessage(message.id)} className={`block w-full p-4 text-left transition hover:bg-black/5 dark:hover:bg-white/5 ${selected?.id === message.id ? "bg-primary/10" : ""}`}>
								<div className="flex items-start justify-between gap-3">
									<span className="font-semibold">{message.subject}</span>
									<span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">{label(message.status)}</span>
								</div>
								<p className="mt-1 text-sm text-gray-500">{message.customerName} · {message.customerEmail}</p>
								<p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{message.description}</p>
								<p className="mt-2 text-xs text-gray-500">{new Date(message.createdAt).toLocaleString()}</p>
							</button>
						))}
						{!loading && messages.length === 0 && <div className="p-8 text-center text-sm text-gray-500"><MessageSquareText className="mx-auto mb-2" size={24} />No platform contact messages found.</div>}
					</div>
					<div className="flex items-center justify-between gap-3 border-t border-gray-200 p-3 text-xs text-gray-500 dark:border-white/10">
						<span>{total} message{total === 1 ? "" : "s"} · Page {page} of {totalPages}</span>
						<div className="flex gap-2"><button type="button" disabled={loading || page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40 dark:border-white/10">Previous</button><button type="button" disabled={loading || page >= totalPages} onClick={() => setPage((current) => current + 1)} className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40 dark:border-white/10">Next</button></div>
					</div>
				</section>

				<section className="glass-card min-h-80 min-w-0 p-4 sm:p-6" aria-label="Selected message details">
					{loadingDetail ? <div className="flex items-center gap-2 text-sm text-gray-500"><LoaderCircle className="animate-spin" size={16} /> Loading message…</div> : selected ? <>
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div><h3 className="text-xl font-semibold">{selected.subject}</h3><p className="mt-1 text-sm text-gray-500">Received {new Date(selected.createdAt).toLocaleString()}</p></div>
							<label className="text-sm"><span className="sr-only">Message status</span><select value={selected.status} onChange={(event) => void changeStatus(event.target.value)} className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 dark:border-white/10">{statuses.slice(1).map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
						</div>
						<div className="mt-5 rounded-xl bg-black/5 p-4 dark:bg-white/5">
							<div className="flex flex-wrap gap-x-5 gap-y-1 text-sm"><span className="font-medium">{selected.customerName}</span><a className="inline-flex items-center gap-1 text-primary underline" href={`mailto:${selected.customerEmail}`}><Mail size={14} />{selected.customerEmail}</a>{selected.customerPhone && <a className="text-primary underline" href={`tel:${selected.customerPhone}`}>{selected.customerPhone}</a>}</div>
							<p className="mt-4 whitespace-pre-wrap text-sm leading-6">{selected.description}</p>
						</div>
						<div className="mt-6 space-y-3">
							<h4 className="font-semibold">Replies</h4>
							{selected.replies?.length ? selected.replies.map((item) => <div key={item.id} className={`rounded-xl p-4 ${item.isAdmin ? "bg-primary/10" : "bg-black/5 dark:bg-white/5"}`}><p className="mb-2 text-xs text-gray-500">{item.isAdmin ? "Platform support" : selected.customerName} · {new Date(item.createdAt).toLocaleString()}</p><p className="whitespace-pre-wrap text-sm">{item.reply}</p></div>) : <p className="text-sm text-gray-500">No replies yet.</p>}
						</div>
						<div className="mt-6 border-t border-gray-200 pt-5 dark:border-white/10">
							<label className="block"><span className="mb-2 block text-sm font-semibold">Reply to this message</span><textarea value={reply} onChange={(event) => setReply(event.target.value)} maxLength={4000} rows={4} placeholder="Write a reply to the sender" className="w-full resize-y rounded-lg border border-gray-300 bg-transparent p-3 text-sm dark:border-white/10" /></label>
							<button type="button" onClick={() => void sendReply()} disabled={!reply.trim() || sending} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{sending ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}{sending ? "Sending…" : "Send reply"}</button>
						</div>
					</> : <div className="flex min-h-64 flex-col items-center justify-center text-center text-gray-500"><MessageSquareText size={30} /><p className="mt-3 text-sm">Select a message to read and reply.</p></div>}
				</section>
			</div>
		</div>
	)
}
