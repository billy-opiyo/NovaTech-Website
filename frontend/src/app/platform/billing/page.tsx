"use client"

import { FormEvent, useEffect, useState } from "react"
import { useToast } from "@/components/ui/Toast"

type Plan = {
	id: string
	key: string
	name: string
	price: number | null
	currency: string
	billingInterval: "MONTH" | "YEAR" | null
	setupFeeAmount: number
	transactionFeePercent: number
	stripePriceId?: string | null
	active: boolean
}

type Addon = { id: string; key: string; name: string; description?: string | null; price: number; currency: string; billingInterval: string; active: boolean }
type BillingData = { plans: Plan[]; addons: Addon[]; stats: { subscriptionCount: number; activeSubscriptionCount: number; paidRevenue: number; generatedCommission: number }; failedPayments: { id: string; tenantId: string; provider: string; amount: number; currency: string; failureReason?: string | null }[] }

function money(value: number, currency = "KES") { return `${currency} ${Number(value || 0).toLocaleString()}` }
function humanize(value: string) { return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) }

export default function PlatformBillingPage() {
	const [data, setData] = useState<BillingData | null>(null)
	const [message, setMessage] = useState("Loading platform billing…")
	const [key, setKey] = useState("")
	const [name, setName] = useState("")
	const [price, setPrice] = useState("")
	const [setupFeeAmount, setSetupFeeAmount] = useState("0")
	const [billingInterval, setBillingInterval] = useState<"MONTH" | "YEAR">("MONTH")
	const [active, setActive] = useState(true)
	const { addToast } = useToast()

	async function load() {
		const response = await fetch("/api/platform/billing", { cache: "no-store" })
		const result = await response.json()
		if (!response.ok) throw new Error(result.message || "Platform billing unavailable")
		setData(result)
		setMessage("")
	}

	useEffect(() => { load().catch((error) => setMessage(error.message || "Platform billing unavailable")) }, [])

	function editPlan(plan: Plan) {
		setKey(plan.key)
		setName(plan.name)
		setPrice(plan.price == null ? "" : String(plan.price))
		setSetupFeeAmount(String(plan.setupFeeAmount || 0))
		setBillingInterval(plan.billingInterval || "MONTH")
		setActive(plan.active)
	}

	function clearForm() {
		setKey("")
		setName("")
		setPrice("")
		setSetupFeeAmount("0")
		setBillingInterval("MONTH")
		setActive(true)
	}

	async function savePlan(event: FormEvent) {
		event.preventDefault()
		setMessage("Saving plan…")
		const response = await fetch("/api/platform/billing", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action: "plan", key: key.toUpperCase(), name, price: price === "" ? null : Number(price), currency: "KES", billingInterval: price === "" ? null : billingInterval, setupFeeAmount: Number(setupFeeAmount), transactionFeePercent: 0, active }),
		})
		const result = await response.json()
	if (!response.ok) { const message = result.message || "Unable to save plan"; setMessage(message); addToast(message, "error"); return }
		setMessage("Plan saved")
		addToast("Plan saved successfully.", "success")
		clearForm()
		await load()
	}

	if (!data) return <div className="glass-card p-6"><p>{message}</p><p className="mt-2 text-sm text-amber-700">Billing configuration requires the platform database. No placeholder prices or revenue data are shown.</p></div>

	return <div className="space-y-6">
		<div><h2 className="text-3xl font-bold">Plans and billing</h2><p className="mt-2 text-gray-600 dark:text-gray-300">Configure merchant SaaS subscriptions and one-time onboarding fees.</p><p className="mt-2 text-sm text-gray-500">Shopper purchases are completed directly with independent stores. Commission totals below are historical records only; new shopper payments are disabled.</p></div>
		{message && <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{message}</div>}
		<div className="grid gap-4 md:grid-cols-4"><div className="glass-card p-5"><p className="text-sm text-gray-500">Subscriptions</p><p className="mt-2 text-2xl font-bold">{data.stats.subscriptionCount}</p></div><div className="glass-card p-5"><p className="text-sm text-gray-500">Active / trialing</p><p className="mt-2 text-2xl font-bold">{data.stats.activeSubscriptionCount}</p></div><div className="glass-card p-5"><p className="text-sm text-gray-500">Paid invoice revenue</p><p className="mt-2 text-2xl font-bold">{money(data.stats.paidRevenue)}</p></div><div className="glass-card p-5"><p className="text-sm text-gray-500">Legacy commission records</p><p className="mt-2 text-2xl font-bold">{money(data.stats.generatedCommission)}</p></div></div>
		<div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
			<div className="glass-card p-5"><div className="flex items-center justify-between gap-3"><h3 className="text-xl font-semibold">Configured plans</h3><button type="button" onClick={clearForm} className="text-sm font-semibold text-primary">New plan</button></div><div className="mt-3 divide-y divide-gray-100">{data.plans.map((plan) => <div key={plan.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span><b>{plan.name}</b> <span className="text-gray-500">({plan.key})</span><br /><span className="text-xs text-gray-500">Subscription: {plan.price == null ? "Trial" : `${money(plan.price, plan.currency)} / ${plan.billingInterval?.toLowerCase()}`} · Setup: {money(plan.setupFeeAmount, plan.currency)}</span></span><span className="flex items-center gap-3"><span>{plan.active ? "Active" : "Inactive"}</span><button type="button" onClick={() => editPlan(plan)} className="rounded border px-3 py-1 text-xs font-semibold">Edit</button></span></div>)}</div><form onSubmit={savePlan} className="mt-5 grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-semibold">Plan key<input required value={key} onChange={(event) => setKey(event.target.value)} placeholder="STARTER" className="rounded border p-2 font-normal dark:bg-dark-surface" /></label><label className="grid gap-1 text-sm font-semibold">Plan name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Starter" className="rounded border p-2 font-normal dark:bg-dark-surface" /></label><label className="grid gap-1 text-sm font-semibold">Recurring price<input type="number" min="0" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Blank for trial" className="rounded border p-2 font-normal dark:bg-dark-surface" /></label><label className="grid gap-1 text-sm font-semibold">One-time setup fee<input required type="number" min="0" value={setupFeeAmount} onChange={(event) => setSetupFeeAmount(event.target.value)} className="rounded border p-2 font-normal dark:bg-dark-surface" /></label><label className="grid gap-1 text-sm font-semibold">Billing interval<select value={billingInterval} onChange={(event) => setBillingInterval(event.target.value as "MONTH" | "YEAR")} disabled={price === ""} className="rounded border p-2 font-normal dark:bg-dark-surface"><option value="MONTH">Monthly</option><option value="YEAR">Yearly</option></select></label><label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /> Active plan</label><div className="flex gap-2 sm:col-span-2"><button className="btn-primary">Save plan</button><button type="button" onClick={clearForm} className="rounded border px-4 py-2 font-semibold">Clear</button></div></form></div>
			<div className="glass-card p-5"><h3 className="text-xl font-semibold">Add-ons</h3><div className="mt-3 divide-y divide-gray-100">{data.addons.map((addon) => <div key={addon.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span><b>{addon.name}</b> <span className="text-gray-500">({addon.key})</span></span><span>{money(addon.price, addon.currency)} / {addon.billingInterval.toLowerCase()} · {addon.active ? "Active" : "Inactive"}</span></div>)}</div><p className="mt-4 text-sm text-gray-500">Add-ons are database-managed through the platform billing API and can optionally be linked to Stripe recurring price IDs.</p></div>
		</div>
		<div className="glass-card p-5"><h3 className="text-xl font-semibold">Failed SaaS payments</h3>{data.failedPayments.length ? <div className="mt-3 divide-y divide-gray-100">{data.failedPayments.map((payment) => <div key={payment.id} className="flex justify-between gap-3 py-3 text-sm"><span>{payment.provider} · tenant {payment.tenantId}</span><span>{money(payment.amount, payment.currency)} · {humanize(payment.failureReason || "Failed")}</span></div>)}</div> : <p className="mt-3 text-sm text-gray-500">No failed SaaS payments recorded.</p>}</div>
	</div>
}
