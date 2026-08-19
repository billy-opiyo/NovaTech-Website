"use client"

import { useEffect, useState } from "react"

export default function ManageBillingPage() {
	const [message, setMessage] = useState("Loading billing status…")
	useEffect(() => { fetch("/api/manage/billing", { cache: "no-store" }).then(async (response) => { const data = await response.json(); setMessage(response.ok ? `${data.tenant.plan?.name || "Plan unavailable"} · ${data.tenant.subscriptions?.[0]?.status || data.tenant.status}` : data.message || "Billing status unavailable") }).catch(() => setMessage("Billing status unavailable")) }, [])
	return <div className="space-y-6"><div><h1 className="text-3xl font-bold">Subscription and usage</h1><p className="mt-1 text-gray-500">SaaS billing is separate from shopper checkout.</p></div><div className="glass-card p-6"><p>{message}</p><p className="mt-3 text-sm text-amber-700">Plan changes, invoices, and payment portal actions remain unavailable until SaaS billing credentials and webhook verification are configured.</p></div></div>
}
