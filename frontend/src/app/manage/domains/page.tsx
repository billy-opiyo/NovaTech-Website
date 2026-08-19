"use client"

import { FormEvent, useEffect, useState } from "react"

type Domain = { id: string; hostname: string; type: string; verificationStatus: string; sslStatus: string | null; isCanonical: boolean; verifiedAt: string | null }

export default function DomainsPage() {
	const [hostname, setHostname] = useState("")
	const [domains, setDomains] = useState<Domain[]>([])
	const [record, setRecord] = useState<{ name: string; value: string } | null>(null)
	const [message, setMessage] = useState("")
	const [error, setError] = useState("")

	async function load() {
		const response = await fetch("/api/manage/domains", { cache: "no-store" })
		if (response.ok) setDomains((await response.json()).domains || [])
	}
	useEffect(() => { void load() }, [])

	async function addDomain(event: FormEvent) {
		event.preventDefault(); setMessage(""); setError(""); setRecord(null)
		const response = await fetch("/api/manage/domains", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hostname }) })
		const data = await response.json().catch(() => ({}))
		if (!response.ok) setError(data.message || "Unable to add domain")
		else { setMessage("Domain added. DNS verification is still required."); setRecord(data.verification); setHostname(""); await load() }
	}

	async function removeDomain(id: string) {
		const response = await fetch(`/api/manage/domains?id=${encodeURIComponent(id)}`, { method: "DELETE" })
		if (response.ok) { setMessage("Custom domain removed."); await load() } else setError((await response.json().catch(() => ({}))).message || "Unable to remove domain")
	}

	return <div className="space-y-6"><div><h1 className="text-3xl font-bold">Domains</h1><p className="mt-1 text-gray-500">Connect a custom hostname after you control its DNS. Verification and SSL are shown from server state only.</p></div><form onSubmit={addDomain} className="glass-card flex flex-col gap-3 p-6 sm:flex-row sm:items-end"><label className="block flex-1"><span className="text-sm font-medium">Custom hostname</span><input required value={hostname} onChange={(event) => setHostname(event.target.value)} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" placeholder="shop.example.com" /></label><button type="submit" className="btn-primary">Add domain</button></form>{record && <div className="glass-card border border-amber-300/50 p-6"><h2 className="font-bold">Add this DNS verification record</h2><p className="mt-2 text-sm text-gray-500">The platform has not checked DNS yet. Add this TXT record, then verification can be performed when DNS automation is connected.</p><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="font-semibold">Name</dt><dd className="mt-1 break-all font-mono">{record.name}</dd></div><div><dt className="font-semibold">Value</dt><dd className="mt-1 break-all font-mono">{record.value}</dd></div></dl></div>}{error && <p className="text-sm text-red-600">{error}</p>}{message && <p className="text-sm text-green-600">{message}</p>}<section className="glass-card p-6"><h2 className="text-xl font-bold">Registered domains</h2>{domains.length === 0 ? <p className="mt-3 text-sm text-gray-500">No domains registered yet.</p> : <div className="mt-4 space-y-3">{domains.map((domain) => <div key={domain.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-semibold">{domain.hostname}</p><p className="text-sm text-gray-500">DNS: {domain.verificationStatus} · SSL: {domain.sslStatus || "not reported"}</p></div>{domain.type === "CUSTOM" && <button type="button" onClick={() => void removeDomain(domain.id)} className="text-sm font-semibold text-red-600">Remove</button>}</div>)}</div>}</section></div>
}
