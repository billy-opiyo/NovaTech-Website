"use client"

import { useEffect, useState } from "react"

type BillingData = {
	tenant: {
		status: string
		plan?: { key: string; name: string; price: number | null; currency: string; billingInterval: string | null }
		subscriptions: Array<{ status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean; trialEndsAt: string | null }>
	}
	entitlements: Record<string, unknown>
	usage: Array<{ metric: string; value: number; periodStart: string; periodEnd: string }>
}

function humanize(value: string) {
	return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value: string | null | undefined) {
	if (!value) return "Not configured"
	const date = new Date(value)
	return Number.isNaN(date.getTime()) ? "Not configured" : date.toLocaleDateString()
}

export default function ManageBillingPage() {
	const [data, setData] = useState<BillingData | null>(null)
	const [message, setMessage] = useState("Loading billing status…")
	useEffect(() => {
		fetch("/api/manage/billing", { cache: "no-store" })
			.then(async (response) => {
				const result = await response.json()
				if (!response.ok) return setMessage(result.message || "Billing status unavailable")
				setData(result)
				setMessage("")
			})
			.catch(() => setMessage("Billing status unavailable"))
	}, [])

	const subscription = data?.tenant.subscriptions?.[0]
	const usageByMetric = new Map((data?.usage || []).map((item) => [item.metric, item]))
	const entitlementEntries = Object.entries(data?.entitlements || {})

	return <div className="space-y-6">
		<div><h1 className="text-3xl font-bold">Subscription and usage</h1><p className="mt-1 text-gray-500">SaaS billing is separate from shopper checkout.</p></div>
		{message ? <div className="glass-card p-6"><p>{message}</p><p className="mt-3 text-sm text-amber-700">Plan changes, invoices, and payment portal actions remain unavailable until SaaS billing credentials and webhook verification are configured.</p></div> : null}
		{data ? <>
			<div className="grid gap-4 md:grid-cols-2">
				<div className="glass-card p-6"><p className="text-sm text-gray-500">Configured plan</p><h2 className="mt-2 text-2xl font-semibold">{data.tenant.plan?.name || "Plan unavailable"}</h2><p className="mt-2 text-sm text-gray-600">{data.tenant.plan?.price == null ? "Price configured by platform" : `${data.tenant.plan.currency} ${data.tenant.plan.price}${data.tenant.plan.billingInterval ? ` / ${data.tenant.plan.billingInterval.toLowerCase()}` : ""}`}</p><p className="mt-4 text-sm text-gray-500">Tenant status: <span className="font-medium text-gray-800">{humanize(data.tenant.status)}</span></p></div>
				<div className="glass-card p-6"><p className="text-sm text-gray-500">Subscription lifecycle</p><h2 className="mt-2 text-2xl font-semibold">{humanize(subscription?.status || data.tenant.status)}</h2><p className="mt-2 text-sm text-gray-600">{subscription?.cancelAtPeriodEnd ? "Cancellation scheduled at period end" : `Period ends ${formatDate(subscription?.currentPeriodEnd || subscription?.trialEndsAt)}`}</p><p className="mt-4 text-sm text-gray-500">No live payment actions are enabled in this environment.</p></div>
			</div>
			<div className="glass-card p-6"><h2 className="text-xl font-semibold">Entitlements</h2>{entitlementEntries.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{entitlementEntries.map(([key, value]) => { const current = typeof value === "number" ? usageByMetric.get(key)?.value || 0 : null; const percent = typeof value === "number" && value > 0 ? Math.min(100, ((current || 0) / value) * 100) : 0; return <div className="rounded-xl border border-gray-200 p-4" key={key}><div className="flex items-center justify-between gap-3"><span className="font-medium">{humanize(key)}</span><span className="text-sm text-gray-500">{typeof value === "boolean" ? (value ? "Enabled" : "Disabled") : typeof value === "number" ? `${current} / ${value}` : String(value)}</span></div>{typeof value === "number" ? <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100"><div className={`h-full rounded-full ${percent >= 90 ? "bg-amber-500" : "bg-indigo-500"}`} style={{ width: `${percent}%` }} /></div> : null}</div> })}</div> : <p className="mt-3 text-sm text-gray-500">No entitlement limits are configured for this plan yet.</p>}</div>
			<div className="glass-card p-6"><h2 className="text-xl font-semibold">Current usage</h2>{data.usage.length ? <div className="mt-4 divide-y divide-gray-100">{data.usage.map((item) => <div className="flex flex-wrap items-center justify-between gap-3 py-3" key={`${item.metric}-${item.periodStart}`}><span>{humanize(item.metric)}</span><span className="text-sm text-gray-500">{item.value} used · period ends {formatDate(item.periodEnd)}</span></div>)}</div> : <p className="mt-3 text-sm text-gray-500">No usage counters are active for the current period.</p>}</div>
			<div className="glass-card p-6"><p className="text-sm text-amber-700">Plan changes, invoices, payment portal actions, and provider webhook verification remain unavailable until SaaS billing credentials and live provider configuration are completed.</p></div>
		</> : null}
	</div>
}
