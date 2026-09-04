"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

type Check = { key: string; label: string; status: "PASS" | "PENDING" | "FAIL"; detail: string; source: string }

export default function LaunchReadinessPage() {
	const [checks, setChecks] = useState<Check[]>([])
	const [ready, setReady] = useState(false)
	const [message, setMessage] = useState("Loading launch checklist…")
	const [refreshing, setRefreshing] = useState(false)

	async function load() {
		const response = await fetch("/api/manage/readiness", { cache: "no-store" })
		const data = await response.json().catch(() => ({}))
		if (!response.ok) throw new Error(data.message || "Launch readiness unavailable")
		setChecks(data.checks || [])
		setReady(Boolean(data.ready))
		setMessage("")
	}

	useEffect(() => { load().catch((error) => setMessage(error.message)) }, [])
	async function refresh() { setRefreshing(true); try { await load() } catch (error) { setMessage(error instanceof Error ? error.message : "Launch readiness unavailable") } finally { setRefreshing(false) } }

	return <div className="space-y-6"><div><h1 className="text-3xl font-bold">Launch readiness</h1><p className="mt-1 text-gray-500">Review the server-backed checks required before publishing or relying on a merchant storefront.</p></div>{message && <p className="text-sm text-amber-700">{message}</p>}<section className={`glass-card border p-5 ${ready ? "border-green-300" : "border-amber-300"}`}><p className="text-lg font-bold">{ready ? "Ready for publication" : "Action required before publication"}</p><p className="mt-1 text-sm text-gray-500">A failed or pending check is not treated as a successful external verification.</p></section><section className="glass-card divide-y dark:divide-gray-700">{checks.map((check) => <div key={check.key} className="flex flex-wrap items-start justify-between gap-4 p-5"><div><h2 className="font-semibold">{check.label}</h2><p className="mt-1 text-sm text-gray-500">{check.detail}</p><p className="mt-2 text-xs text-gray-400">Source: {check.source}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${check.status === "PASS" ? "bg-green-100 text-green-700" : check.status === "FAIL" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{check.status}</span></div>)}</section><button disabled={refreshing} onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-semibold disabled:opacity-50">{refreshing && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} {refreshing ? "Refreshing…" : "Refresh checks"}</button></div>
}
