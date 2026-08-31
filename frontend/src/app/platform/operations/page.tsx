"use client"

import { useCallback, useEffect, useState } from "react"

type Stats = {
	totalTenants: number
	activeTenants: number
	trialingTenants: number
	suspendedTenants: number
	publishedStores: number
	productCount: number
	orderCount: number
	customerCount: number
	openTicketCount: number
	activeSubscriptionCount: number
	pendingSetupFees: number
	paidRevenue: number
}

type TenantRow = {
	id: string
	legalName: string | null
	status: string
	verificationStatus: string
	createdAt: string
	updatedAt: string
	suspendedAt: string | null
	plan: { key: string; name: string; price: number | null; currency: string; billingInterval: string | null; setupFeeAmount: number } | null
	store: { id: string; name: string; slug: string; publicationStatus: string; updatedAt: string; domains: { hostname: string; verificationStatus: string; sslStatus: string | null; isCanonical: boolean }[] } | null
	billingRecord: { setupFeeAmount: number; currency: string; setupFeeStatus: string; setupFeePaidAt: string | null } | null
	subscriptions: { status: string; provider: string | null; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean }[]
	_count: { products: number; orders: number; supportTickets: number; memberships: number }
	preview: { local: string; production: string } | null
}

type ActivityRow = {
	id: string
	action: string
	details: Record<string, unknown> | null
	createdAt: string
	admin: { name: string | null; email: string | null } | null
	tenant: { id: string; legalName: string | null; store: { name: string; slug: string } | null } | null
}

type InvoiceRow = {
	id: string
	kind: string
	status: string
	total: number
	currency: string
	createdAt: string
	tenant: { legalName: string | null; store: { name: string; slug: string } | null } | null
}

type OperationsData = { stats: Stats; tenants: TenantRow[]; activity: ActivityRow[]; recentInvoices: InvoiceRow[] }

function date(value?: string | null) {
	return value ? new Date(value).toLocaleString() : "—"
}

function money(value: number, currency = "KES") {
	return `${currency} ${Number(value || 0).toLocaleString()}`
}

function statusClass(status: string) {
	if (["ACTIVE", "PUBLISHED", "PAID"].includes(status)) return "bg-green-100 text-green-800"
	if (["SUSPENDED", "FAILED", "PAST_DUE"].includes(status)) return "bg-red-100 text-red-800"
	return "bg-amber-100 text-amber-800"
}

export default function PlatformOperationsPage() {
	const [data, setData] = useState<OperationsData | null>(null)
	const [message, setMessage] = useState("Loading platform operations…")
	const [search, setSearch] = useState("")
	const [status, setStatus] = useState("ALL")
	const [busyTenant, setBusyTenant] = useState<string | null>(null)

	const load = useCallback(async () => {
		setMessage("Loading platform operations…")
		const params = new URLSearchParams({ limit: "100", status })
		if (search.trim()) params.set("search", search.trim())
		const response = await fetch(`/api/platform/operations?${params.toString()}`, { cache: "no-store" })
		const result = await response.json()
		if (!response.ok) throw new Error(result.message || "Platform operations unavailable")
		setData(result)
		setMessage("")
	}, [search, status])

	useEffect(() => {
		const timer = window.setTimeout(() => load().catch((error) => setMessage(error.message)), 250)
		return () => window.clearTimeout(timer)
	}, [load])

	async function changeStoreStatus(tenantId: string, action: "suspend_store" | "reactivate_store" | "approve_verification" | "reject_verification" | "request_verification") {
		setBusyTenant(tenantId)
		try {
			const response = await fetch("/api/platform/operations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, tenantId }) })
			const result = await response.json()
			if (!response.ok) throw new Error(result.message || "Platform operation failed")
			await load()
		} catch (error: unknown) {
			setMessage(error instanceof Error ? error.message : "Platform operation failed")
		} finally {
			setBusyTenant(null)
		}
	}

	if (!data) return <div className="glass-card p-6"><p>{message}</p><p className="mt-2 text-sm text-amber-700">Platform-wide operations require the configured database and a platform-authorized session. No placeholder store or metric data is shown.</p></div>

	const cards = [
		["Merchant stores", data.stats.totalTenants, `${data.stats.publishedStores} published`],
		["Active / trialing", data.stats.activeTenants + data.stats.trialingTenants, `${data.stats.suspendedTenants} suspended`],
		["Products listed", data.stats.productCount, `${data.stats.orderCount} historical orders`],
		["Customers", data.stats.customerCount, `${data.stats.openTicketCount} open support tickets`],
		["Active subscriptions", data.stats.activeSubscriptionCount, `${data.stats.pendingSetupFees} setup fees pending`],
		["Paid SaaS revenue", money(data.stats.paidRevenue), "Invoice totals recorded"],
	] as const

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-3xl font-bold">Platform operations</h2>
				<p className="mt-2 text-gray-600 dark:text-gray-300">Global merchant-store visibility for authorized Nurava Tech platform operators.</p>
				{message && <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{cards.map(([label, value, note]) => <div className="glass-card p-5" key={label}><p className="text-sm text-gray-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-gray-500">{note}</p></div>)}
			</div>

			<div className="glass-card p-5">
				<div className="flex flex-wrap items-end gap-3">
					<label className="grid gap-1 text-sm font-semibold">Search stores or tenants<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Store name, slug, or legal name" className="rounded border p-2 font-normal dark:bg-dark-surface" /></label>
					<label className="grid gap-1 text-sm font-semibold">Status<select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded border p-2 font-normal dark:bg-dark-surface"><option value="ALL">All</option><option value="TRIALING">Trialing</option><option value="ACTIVE">Active</option><option value="PAST_DUE">Past due</option><option value="SUSPENDED">Suspended</option><option value="CANCELLED">Cancelled</option></select></label>
					<button onClick={() => load().catch((error) => setMessage(error.message))} className="rounded border px-4 py-2 text-sm font-semibold">Refresh</button>
				</div>
				<div className="mt-3 flex flex-wrap gap-2 text-xs">{data.tenants.filter((tenant) => tenant.verificationStatus !== "APPROVED").map((tenant) => <a key={tenant.id} href={`/platform/verification/${tenant.id}`} className="rounded border px-2 py-1 font-semibold text-primary underline">Review verification: {tenant.store?.name || tenant.legalName || tenant.id}</a>)}</div>
				<div className="mt-5 overflow-x-auto">
					<table className="w-full min-w-[1000px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-gray-500"><th className="px-3 py-3">Store</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Verification</th><th className="px-3 py-3">Plan</th><th className="px-3 py-3">Activity counts</th><th className="px-3 py-3">Billing</th><th className="px-3 py-3">Actions</th></tr></thead><tbody>{data.tenants.map((tenant) => { const subscription = tenant.subscriptions[0]; const suspended = tenant.status === "SUSPENDED" || tenant.store?.publicationStatus === "SUSPENDED"; return <tr className="border-b align-top" key={tenant.id}><td className="px-3 py-4"><p className="font-semibold">{tenant.store?.name || tenant.legalName || "Unnamed store"}</p><p className="text-xs text-gray-500">{tenant.store ? `/${tenant.store.slug}` : tenant.id}</p><p className="mt-1 text-xs text-gray-500">Updated {date(tenant.updatedAt)}</p>{tenant.preview && <div className="mt-2 flex flex-wrap gap-2 text-xs"><a className="text-primary underline" href={tenant.preview.local} target="_blank" rel="noreferrer">Local preview</a><a className="text-primary underline" href={tenant.preview.production} target="_blank" rel="noreferrer">Production URL</a></div>}</td><td className="px-3 py-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(tenant.status)}`}>{tenant.status}</span><p className="mt-2 text-xs text-gray-500">Store: {tenant.store?.publicationStatus || "Not created"}</p></td><td className="px-3 py-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(tenant.verificationStatus)}`}>{tenant.verificationStatus}</span>{tenant.verificationStatus !== "APPROVED" && <div className="mt-2 flex flex-wrap gap-2"><button disabled={busyTenant === tenant.id} onClick={() => changeStoreStatus(tenant.id, "approve_verification")} className="rounded border border-green-600 px-2 py-1 text-xs font-semibold text-green-700 disabled:opacity-50">Approve</button><button disabled={busyTenant === tenant.id} onClick={() => changeStoreStatus(tenant.id, "reject_verification")} className="rounded border border-red-600 px-2 py-1 text-xs font-semibold text-red-700 disabled:opacity-50">Reject</button></div>}</td><td className="px-3 py-4"><p className="font-semibold">{tenant.plan?.name || "No plan"}</p><p className="text-xs text-gray-500">{tenant.plan?.price == null ? "Trial" : `${money(tenant.plan.price, tenant.plan.currency)} / ${tenant.plan.billingInterval?.toLowerCase()}`}</p><p className="text-xs text-gray-500">Setup: {money(tenant.billingRecord?.setupFeeAmount ?? tenant.plan?.setupFeeAmount ?? 0, tenant.billingRecord?.currency || "KES")}</p></td><td className="px-3 py-4 text-xs text-gray-600"><p>{tenant._count.products} products · {tenant._count.orders} orders</p><p>{tenant._count.memberships} members · {tenant._count.supportTickets} tickets</p></td><td className="px-3 py-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(tenant.billingRecord?.setupFeeStatus || "UNKNOWN")}`}>Setup {tenant.billingRecord?.setupFeeStatus || "UNKNOWN"}</span><p className="mt-2 text-xs text-gray-500">Subscription: {subscription?.status || "None"}</p><p className="text-xs text-gray-500">Provider: {subscription?.provider || "—"}</p></td><td className="px-3 py-4"><div className="flex flex-col items-start gap-2">{suspended ? <button disabled={busyTenant === tenant.id} onClick={() => changeStoreStatus(tenant.id, "reactivate_store")} className="rounded border border-green-600 px-3 py-1 text-xs font-semibold text-green-700 disabled:opacity-50">{busyTenant === tenant.id ? "Saving…" : "Reactivate"}</button> : <button disabled={busyTenant === tenant.id} onClick={() => changeStoreStatus(tenant.id, "suspend_store")} className="rounded border border-red-600 px-3 py-1 text-xs font-semibold text-red-700 disabled:opacity-50">{busyTenant === tenant.id ? "Saving…" : "Suspend store"}</button>}<a href={tenant.preview?.production || tenant.preview?.local || "#"} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary underline">Open storefront</a></div></td></tr> })}</tbody></table>{!data.tenants.length && <p className="p-6 text-sm text-gray-500">No stores match the current filters.</p>}
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<div className="glass-card p-5"><h3 className="text-xl font-semibold">Recent cross-store activity</h3><div className="mt-3 divide-y divide-gray-100">{data.activity.length ? data.activity.map((item) => <div className="py-3 text-sm" key={item.id}><div className="flex justify-between gap-3"><span className="font-semibold">{item.action}</span><span className="text-xs text-gray-500">{date(item.createdAt)}</span></div><p className="mt-1 text-xs text-gray-500">{item.tenant?.store?.name || item.tenant?.legalName || "Unknown store"} · {item.admin?.name || item.admin?.email || "Platform user"}</p></div>) : <p className="py-3 text-sm text-gray-500">No activity records are available.</p>}</div></div>
				<div className="glass-card p-5"><h3 className="text-xl font-semibold">Recent SaaS invoices</h3><div className="mt-3 divide-y divide-gray-100">{data.recentInvoices.length ? data.recentInvoices.map((invoice) => <div className="flex justify-between gap-3 py-3 text-sm" key={invoice.id}><span><b>{invoice.tenant?.store?.name || invoice.tenant?.legalName || "Unknown store"}</b><br /><span className="text-xs text-gray-500">{invoice.kind} · {date(invoice.createdAt)}</span></span><span className="text-right"><b>{money(invoice.total, invoice.currency)}</b><br /><span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(invoice.status)}`}>{invoice.status}</span></span></div>) : <p className="py-3 text-sm text-gray-500">No invoices are available.</p>}</div></div>
			</div>
		</div>
	)
}
