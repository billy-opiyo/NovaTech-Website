"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, BadgeCheck, Check, CheckCircle2, CircleDollarSign, FileText, LayoutDashboard, Palette, Package, Rocket, Search, Settings2, ShieldCheck, Store, Upload, UserPlus, WalletCards } from "lucide-react"
import type { PublicPlan } from "@/lib/public-plans.server"
import { useTheme } from "@/components/providers/ThemeProvider"

type GuidePreviewKind = "auth" | "plans" | "onboarding" | "products" | "design" | "verification" | "billing" | "readiness" | "dashboard"

type GuideStep = {
	label: string
	title: string
	description: string
	checklist: string[]
	icon: typeof UserPlus
	preview: GuidePreviewKind
}

const guideSteps: GuideStep[] = [
	{
		label: "Step 1 of 9",
		 title: "Create your merchant account",
		description: "Start from Create Store, then sign in or create an account. This keeps your merchant workspace separate from the customer shopping experience.",
		checklist: ["Choose Create Store from the platform homepage", "Sign in or create your account", "Return to the store setup flow after authentication"],
		icon: UserPlus,
		preview: "auth",
	},
	{
		label: "Step 2 of 9",
		title: "Choose a plan and accept the terms",
		description: "Select the plan that matches your expected catalogue and team size. Review the merchant terms and privacy notice before continuing.",
		checklist: ["Compare capacity, storage, staff, and domain features", "Review any setup fee and monthly subscription", "Accept the current merchant terms and privacy notice"],
		icon: CircleDollarSign,
		preview: "plans",
	},
	{
		label: "Step 3 of 9",
		title: "Set your store identity",
		description: "Give the workspace its public name and an optional platform slug. The slug becomes the readable address customers can use to find your store.",
		checklist: ["Enter the public store name", "Choose a unique lowercase platform slug", "Create the store and open its merchant workspace"],
		icon: Store,
		preview: "onboarding",
	},
	{
		label: "Step 4 of 9",
		title: "Build the product catalogue",
		description: "Add the products customers will see, with accurate prices, stock, categories, variants, images, and descriptions. Larger catalogues can use import and export tools.",
		checklist: ["Create categories and products", "Add images, pricing, stock, and variants", "Review the catalogue before publishing"],
		icon: Package,
		preview: "products",
	},
	{
		label: "Step 5 of 9",
		title: "Design the storefront",
		description: "Shape the public storefront around your brand. Save a draft, preview it, and provide the contact and shipping information shoppers need.",
		checklist: ["Choose a theme and update the homepage", "Add SEO, contact, WhatsApp, and business-hour details", "Set shipping defaults and preview the result"],
		icon: Palette,
		preview: "design",
	},
	{
		label: "Step 6 of 9",
		title: "Complete merchant verification",
		description: "Submit the business, contact, location, tax, M-Pesa ownership, phone, and required evidence details. Verification documents stay private for review.",
		checklist: ["Save your merchant and operating details", "Verify the merchant phone by SMS", "Upload the required evidence for review"],
		icon: ShieldCheck,
		preview: "verification",
	},
	{
		label: "Step 7 of 9",
		title: "Review subscription and M-Pesa billing",
		description: "Check the selected platform plan, setup fee, invoices, and payment history. Nurava Tech platform billing is handled separately from the payments a merchant arranges for product sales.",
		checklist: ["Review the active plan and setup fee", "Use the merchant phone for an M-Pesa request when payment is due", "Confirm invoice and payment status after provider confirmation"],
		icon: CircleDollarSign,
		preview: "billing",
	},
	{
		label: "Step 8 of 9",
		title: "Pass launch readiness and publish",
		description: "Use the server-backed launch checklist to resolve anything still pending. Publish only after your store content, legal acceptance, verification, and access requirements are ready.",
		checklist: ["Review launch readiness checks", "Confirm the final draft and merchant responsibilities", "Publish the storefront and verify its public link"],
		icon: Rocket,
		preview: "readiness",
	},
	{
		label: "Step 9 of 9",
		title: "Operate, support, and grow",
		description: "After launch, your workspace is the control centre for the store. Keep the catalogue current and follow customer activity, enquiries, reviews, deliveries, team access, and analytics.",
		checklist: ["Manage orders, enquiries, customers, and deliveries", "Review and respond to customer feedback", "Use analytics, support, settings, and domains as the store grows"],
		icon: LayoutDashboard,
		preview: "dashboard",
	},
]

const previewPageNames: Record<GuidePreviewKind, string> = {
	auth: "/auth/signin?callbackUrl=%2Fonboarding",
	plans: "/?platformHome=1#plans",
	onboarding: "/onboarding",
	products: "/manage/products",
	design: "/manage/design",
	verification: "/manage/verification",
	billing: "/manage/billing",
	readiness: "/manage/readiness",
	dashboard: "/manage/dashboard",
}

const previewActiveNav: Record<Exclude<GuidePreviewKind, "auth" | "plans" | "onboarding">, string> = {
	products: "Products",
	design: "Store design",
	verification: "Verification",
	billing: "Subscription",
	readiness: "Launch readiness",
	dashboard: "Dashboard",
}

function PreviewInput({ label, value, className = "" }: { label: string; value: string; className?: string }) {
	return <div className={`min-w-0 ${className}`}><span className="block text-[9px] font-semibold text-slate-400">{label}</span><div className="mt-1 truncate rounded border border-slate-700 bg-[#0f172a] px-2 py-1.5 text-[10px] text-slate-200">{value}</div></div>
}

function PreviewButton({ children, secondary = false, className = "" }: { children: React.ReactNode; secondary?: boolean; className?: string }) {
	return <span className={`inline-flex max-w-full items-center justify-center rounded px-2.5 py-1.5 text-center text-[10px] font-bold leading-tight ${secondary ? "border border-sky-400/40 text-sky-300" : "bg-primary text-white"} ${className}`}>{children}</span>
}

function PreviewShell({ kind, children }: { kind: Exclude<GuidePreviewKind, "auth" | "plans" | "onboarding">; children: React.ReactNode }) {
	const active = previewActiveNav[kind]
	return <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-sky-400/25 bg-[#0f172a] text-left shadow-inner" aria-hidden="true">
		<div className="flex min-w-0 items-center gap-2 border-b border-slate-700 bg-[#071a36] px-3 py-2"><span className="flex shrink-0 gap-1"><i className="h-1.5 w-1.5 rounded-full bg-red-300" /><i className="h-1.5 w-1.5 rounded-full bg-amber-300" /><i className="h-1.5 w-1.5 rounded-full bg-emerald-300" /></span><span className="min-w-0 truncate rounded bg-[#1e293b] px-2 py-1 text-[9px] text-slate-400">{previewPageNames[kind]}</span></div>
		<div className="grid min-h-[205px] min-w-0 grid-cols-[5rem_minmax(0,1fr)] max-[390px]:grid-cols-1 sm:grid-cols-[7rem_minmax(0,1fr)]">
			<aside className="border-r border-slate-700 bg-[#1e293b] p-2 text-[9px] text-slate-400 max-[390px]:flex max-[390px]:flex-wrap max-[390px]:items-center max-[390px]:gap-1 max-[390px]:border-b max-[390px]:border-r-0"><p className="mb-3 px-1 font-bold text-slate-100 max-[390px]:mb-0 max-[390px]:mr-1">Admin</p>{["Dashboard", "Products", "Store design", "Verification", "Subscription", "Launch readiness"].map((item) => <div key={item} className={`mb-1 rounded px-1.5 py-1 max-[390px]:mb-0 ${item === active ? "bg-primary text-white" : ""}`}>{item}</div>)}</aside>
			<div className="min-w-0 max-w-full bg-[#0f172a] p-3 sm:p-4 max-[390px]:p-2">{children}</div>
		</div>
	</div>
}

function MerchantPagePreview({ kind, plans }: { kind: GuidePreviewKind; plans: PublicPlan[] }) {
	if (kind === "auth") return <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-sky-400/25 bg-[#0f172a] p-4 shadow-inner max-[390px]:p-2" aria-hidden="true"><div className="mx-auto max-w-full rounded-xl border border-slate-700 bg-[#1e293b] p-4 shadow-sm max-[390px]:p-3"><div className="text-center"><p className="text-base font-bold text-slate-100">Welcome Back</p><p className="mt-1 text-[10px] text-slate-400">Sign in to your account to continue</p></div><div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-2 py-2 text-[10px] font-semibold text-slate-200"><span className="font-bold text-blue-400">G</span> Continue with Google</div><div className="my-3 flex items-center gap-2 text-[8px] text-slate-500"><span className="h-px flex-1 bg-slate-700" />or continue with email<span className="h-px flex-1 bg-slate-700" /></div><PreviewInput label="Email" value="you@example.com" /><PreviewInput label="Password" value="••••••••" className="mt-2" /><div className="mt-3"><PreviewButton>Sign In</PreviewButton></div></div></div>
	if (kind === "plans") return <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-sky-400/25 bg-[#0f172a] p-3 shadow-inner max-[390px]:p-2" aria-hidden="true"><div className="text-center"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-primary">Plans for store partners</p><p className="mt-1 text-base font-extrabold text-slate-100">Simple billing, clear capacity</p></div><div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-3">{plans.length ? plans.slice(0, 3).map((plan, index) => <div key={plan.key} className={`min-w-0 rounded-lg border bg-[#1e293b] p-2 ${plan.key === "BUSINESS" || (!plans.some((item) => item.key === "BUSINESS") && index === 1) ? "border-primary ring-1 ring-primary/20" : "border-slate-700"}`}><p className="break-words text-[9px] font-bold uppercase text-primary">{plan.name}</p><p className="mt-1 break-words text-sm font-extrabold text-slate-100">{plan.price == null ? "Contact us" : `${plan.currency} ${plan.price.toLocaleString()}`}{plan.price != null && plan.billingInterval ? <span className="text-[8px] font-medium text-slate-400"> / {plan.billingInterval.toLowerCase()}</span> : null}</p><p className="mt-1 text-[8px] text-slate-400">One-time setup: {plan.currency} {plan.setupFeeAmount.toLocaleString()}</p><div className="mt-2"><PreviewButton secondary>Choose {plan.name}</PreviewButton></div></div>) : <div className="rounded-lg border border-amber-400/40 bg-amber-950/40 p-3 text-[9px] text-amber-200 sm:col-span-3">No public plans are currently configured.</div>}</div></div>
	if (kind === "onboarding") return <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-sky-400/25 bg-[#0f172a] p-4 shadow-inner max-[390px]:p-2" aria-hidden="true"><div className="mx-auto max-w-full rounded-xl border border-slate-700 bg-[#1e293b] p-4 shadow-sm max-[390px]:p-3"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-primary">Nurava Tech SaaS</p><p className="mt-1 text-base font-extrabold text-slate-100">Create your store</p><p className="mt-1 text-[9px] text-slate-400">Set up the store identity first. Products, design, payments, and publishing follow in the workspace.</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><PreviewInput label="Store name" value="Acme Electronics" /><PreviewInput label="Platform slug (optional)" value="acme-electronics" /><PreviewInput label="Choose a plan" value="Business · KES 2,500 / month" className="sm:col-span-2" /></div><p className="mt-3 flex items-start gap-1 text-[8px] text-slate-400"><Check size={10} className="mt-0.5 shrink-0 text-emerald-500" /> <span> I confirm that I reviewed the merchant terms and privacy notice.</span></p><div className="mt-3"><PreviewButton>Create store</PreviewButton></div></div></div>
	if (kind === "products") return <PreviewShell kind={kind}><div className="flex min-w-0 items-start justify-between gap-2 max-[390px]:flex-col"><div className="min-w-0"><p className="text-base font-extrabold text-slate-100">Products</p><p className="text-[9px] text-slate-400">Manage your electronics catalog, pricing, specifications, and galleries.</p></div><PreviewButton>+ Add product</PreviewButton></div><div className="mt-3 flex min-w-0 items-center gap-1 rounded border border-slate-700 bg-[#1e293b] px-2 py-1.5 text-[9px] text-slate-400"><Search size={11} className="shrink-0" /> <span className="min-w-0 break-words">Search by name, brand, SKU, or category</span></div><div className="mt-3 min-w-0 rounded border border-slate-700 bg-[#1e293b] p-2"><p className="text-[9px] font-bold text-slate-200">Add product</p><div className="mt-2 grid grid-cols-1 gap-2 min-[391px]:grid-cols-2"><PreviewInput label="Name *" value="Product name" /><PreviewInput label="Brand *" value="Brand" /><PreviewInput label="Price (KES) *" value="0.00" /><PreviewInput label="Stock *" value="0" /></div><div className="mt-2 flex min-w-0 items-start gap-2"><FileText size={11} className="mt-0.5 shrink-0 text-slate-500" /><span className="break-words text-[9px] text-slate-400">Description · Gallery image URLs · Specifications</span></div></div></PreviewShell>
	if (kind === "design") return <PreviewShell kind={kind}><div className="flex items-start justify-between gap-2 max-[390px]:flex-col"><div className="min-w-0"><p className="text-base font-extrabold text-slate-100">Store design</p><p className="text-[9px] text-slate-400">Customize your public storefront and save a draft.</p></div><Settings2 size={16} className="shrink-0 text-primary" /></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="rounded border border-slate-700 bg-[#1e293b] p-2"><p className="text-[9px] font-bold text-slate-200">Theme preset</p><div className="mt-2 grid grid-cols-2 gap-1"><span className="rounded border border-primary bg-primary/10 p-1 text-[8px] text-sky-300">Modern</span><span className="rounded border border-slate-600 p-1 text-[8px] text-slate-400">Classic</span></div><PreviewInput label="Store name" value="Acme Electronics" className="mt-2" /><PreviewInput label="Hero title" value="Shop our collection" className="mt-2" /></div><div className="rounded border border-primary/30 bg-[#1e293b] p-2"><p className="text-[9px] font-bold text-sky-300">Featured storefront</p><p className="mt-2 text-sm font-extrabold text-slate-100">Shop our collection</p><p className="mt-1 text-[9px] text-slate-400">Reliable products, delivered to you.</p><span className="mt-3 inline-block max-w-full break-words rounded bg-primary px-2 py-1 text-[8px] font-bold text-white">Shop the collection</span></div></div><div className="mt-2 flex flex-wrap gap-2"><PreviewButton>Save draft</PreviewButton><PreviewButton secondary>Publish draft</PreviewButton></div></PreviewShell>
	if (kind === "verification") return <PreviewShell kind={kind}><div><p className="text-base font-extrabold text-slate-100">Merchant verification</p><p className="text-[9px] text-slate-400">Complete these checks before your store can be published or sell.</p></div><div className="mt-3 flex items-center justify-between gap-2 rounded border border-amber-400/40 bg-amber-950/40 p-2 max-[390px]:flex-col max-[390px]:items-start"><div><p className="text-[8px] text-slate-400">Current status</p><p className="text-xs font-bold text-slate-100">Action required</p></div><span className="rounded-full bg-amber-400/20 px-2 py-1 text-[8px] font-bold text-amber-200">Not submitted</span></div><div className="mt-2 min-w-0 rounded border border-slate-700 bg-[#1e293b] p-2"><p className="text-[9px] font-bold text-slate-200">Merchant details</p><div className="mt-2 grid grid-cols-2 gap-2 max-[390px]:grid-cols-1"><PreviewInput label="Merchant type" value="Individual" /><PreviewInput label="Tax status" value="Registered / has KRA PIN" /><PreviewInput label="Legal name" value="Your legal name" /><PreviewInput label="Merchant phone" value="0712 345 678" /></div><div className="mt-2 flex flex-wrap gap-1 max-[390px]:flex-col max-[390px]:items-stretch"><PreviewButton>Save details and continue</PreviewButton><span className="inline-flex items-center gap-1 rounded border border-slate-600 px-2 py-1 text-[8px] text-slate-400"><Upload size={10} /> Verification documents</span></div></div></PreviewShell>
	if (kind === "billing") return <PreviewShell kind={kind}><div><p className="text-base font-extrabold text-slate-100">Subscription and billing</p><p className="text-[9px] text-slate-400">Manage the merchant workspace subscription separately from shopper checkout.</p></div><div className="mt-3 min-w-0 rounded border border-primary/30 bg-primary/10 p-2"><p className="text-[10px] font-bold text-slate-100">Activate your paid plan</p><p className="mt-1 text-[8px] text-slate-400">Pay the setup fee and first monthly subscription together by M-Pesa.</p><div className="mt-2 flex min-w-0 gap-1 max-[390px]:flex-col"><PreviewInput label="Merchant phone" value="07XXXXXXXX" className="min-w-0 flex-1" /><PreviewButton className="max-[390px]:w-full">Pay with M-Pesa</PreviewButton></div></div><div className="mt-2 grid grid-cols-3 gap-1 max-[390px]:grid-cols-1">{[["Current plan", "Business"], ["Setup fee", "PENDING"], ["Shopper fees", "Not applied"]].map(([label, value]) => <div key={label} className="rounded border border-slate-700 bg-[#1e293b] p-2"><p className="text-[8px] text-slate-400">{label}</p><p className="mt-1 break-words text-[10px] font-bold text-slate-100">{value}</p></div>)}</div><div className="mt-2 flex items-start gap-1 text-[8px] text-slate-400"><WalletCards size={11} className="mt-0.5 shrink-0" /> <span>Invoices and payment history appear below.</span></div></PreviewShell>
	if (kind === "readiness") return <PreviewShell kind={kind}><div><p className="text-base font-extrabold text-slate-100">Launch readiness</p><p className="text-[9px] text-slate-400">Review the server-backed checks required before publishing.</p></div><div className="mt-3 rounded border border-amber-400/40 bg-amber-950/40 p-2"><p className="text-xs font-bold text-amber-200">Action required before publication</p><p className="mt-1 text-[8px] text-amber-300">Resolve every pending or failed check before publishing.</p></div><div className="mt-2 divide-y divide-slate-700 rounded border border-slate-700 bg-[#1e293b] px-2">{["Store content", "Legal acceptance", "Merchant verification", "Access requirements"].map((item, index) => <div key={item} className="flex items-center justify-between gap-2 py-2 text-[9px] text-slate-300"><span className="min-w-0 break-words">{item}</span><span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold ${index === 0 ? "bg-emerald-400/20 text-emerald-300" : "bg-amber-400/20 text-amber-200"}`}>{index === 0 ? "PASS" : "PENDING"}</span></div>)}</div><div className="mt-2"><PreviewButton secondary>Refresh checks</PreviewButton></div></PreviewShell>
	return <PreviewShell kind="dashboard"><div className="flex items-start justify-between gap-2 max-[390px]:flex-col"><div className="min-w-0"><p className="text-base font-extrabold text-slate-100">Dashboard</p><p className="text-[9px] text-slate-400">Welcome back, Admin! Here&apos;s what&apos;s happening.</p></div><div className="flex flex-wrap gap-1 max-[390px]:w-full"><PreviewButton secondary className="max-[390px]:flex-1">View Store</PreviewButton><PreviewButton className="max-[390px]:flex-1">View Report</PreviewButton></div></div><div className="mt-3 grid grid-cols-2 gap-2 max-[390px]:grid-cols-1 sm:grid-cols-4">{[["Revenue (7 days)", "KES 0"], ["Orders (7 days)", "0"], ["Average order value", "KES 0"], ["Paid order rate", "0.00%"]].map(([label, value]) => <div key={label} className="rounded border border-primary/30 bg-[#1e293b] p-2"><p className="text-sm font-extrabold text-slate-100">{value}</p><p className="mt-1 text-[8px] text-slate-400">{label}</p></div>)}</div><div className="mt-2 rounded border border-slate-700 bg-[#1e293b] p-3"><p className="text-[10px] font-bold text-slate-200">Sales Overview</p><p className="mt-5 text-center text-[9px] text-slate-400">Live revenue and order charts are available in Analytics.</p></div></PreviewShell>
}

export default function MerchantOnboardingGuide({ plans }: { plans: PublicPlan[] }) {
	const { theme } = useTheme()
	const [activeStep, setActiveStep] = useState(0)
	const [paused, setPaused] = useState(false)
	const touchStartX = useRef<number | null>(null)
	const step = guideSteps[activeStep]
	const StepIcon = step.icon

	useEffect(() => {
		if (paused) return
		const timeout = window.setTimeout(() => setActiveStep((current) => (current + 1) % guideSteps.length), 8000)
		return () => window.clearTimeout(timeout)
	}, [activeStep, paused])

	function moveBy(offset: number) {
		setActiveStep((current) => (current + offset + guideSteps.length) % guideSteps.length)
	}

	function handlePreviewTouchStart(event: React.TouchEvent<HTMLDivElement>) {
		touchStartX.current = event.touches[0]?.clientX ?? null
	}

	function handlePreviewTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
		const start = touchStartX.current
		touchStartX.current = null
		if (start == null) return
		const end = event.changedTouches[0]?.clientX
		if (end == null || Math.abs(end - start) < 40) return
		moveBy(end < start ? 1 : -1)
	}

	return (
		<section aria-labelledby="merchant-onboarding-guide-title" className="min-w-0 max-w-full overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.1] via-transparent to-accent/[0.08] p-5 shadow-xl max-[390px]:rounded-2xl max-[390px]:p-3 sm:p-8" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false) }}>
			<div className="mx-auto max-w-3xl text-center">
				<p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">For store partners</p>
				<h2 id="merchant-onboarding-guide-title" className="mt-2 text-3xl font-extrabold max-[390px]:text-2xl sm:text-4xl">Onboarding Merchant Guide</h2>
				<p className="mt-3 text-gray-600 dark:text-gray-300 max-[390px]:text-sm">Follow the complete path from creating your merchant account to launching and running a customer-ready store.</p>
			</div>

			<div className="mt-8 grid min-w-0 gap-6 max-[390px]:mt-5 max-[390px]:gap-4 lg:grid-cols-[minmax(12rem,0.7fr)_minmax(0,1.7fr)]">
			<nav aria-label="Merchant onboarding steps" className="grid grid-cols-3 gap-2 lg:grid-cols-1 lg:gap-1">
					{guideSteps.map((item, index) => <button type="button" key={item.label} onClick={() => setActiveStep(index)} aria-current={index === activeStep ? "step" : undefined} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${index === activeStep ? "bg-primary text-white shadow-md" : "text-gray-600 hover:bg-primary/10 dark:text-gray-300"}`}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index === activeStep ? "bg-white/20" : "bg-primary/10 text-primary"}`}>{index < activeStep ? <CheckCircle2 size={15} aria-hidden="true" /> : index + 1}</span><span className="hidden lg:inline">{item.title}</span></button>)}
				</nav>

				<article aria-live="polite" data-preview-theme={theme} className="merchant-guide-preview glass-card min-w-0 max-w-full overflow-hidden border border-white/20 p-5 max-[390px]:p-3 sm:p-7">
					<div className="flex flex-wrap items-start justify-between gap-4 max-[390px]:flex-col max-[390px]:gap-3">
						<div className="flex min-w-0 items-center gap-4 max-[390px]:gap-3"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary max-[390px]:h-11 max-[390px]:w-11"><StepIcon size={28} aria-hidden="true" className="max-[390px]:h-5 max-[390px]:w-5" /></div><div className="min-w-0"><p className="text-sm font-bold uppercase tracking-[0.16em] text-primary max-[390px]:text-xs">{step.label}</p><h3 className="mt-1 break-words text-2xl font-extrabold max-[390px]:text-xl">{step.title}</h3></div></div>
						<div className="hidden items-center gap-2 lg:flex" aria-label="Guide controls"><button type="button" onClick={() => moveBy(-1)} aria-label="Previous onboarding step" className="rounded-full border p-2 text-primary transition hover:bg-primary/10"><ArrowLeft size={18} /></button><button type="button" onClick={() => moveBy(1)} aria-label="Next onboarding step" className="rounded-full border p-2 text-primary transition hover:bg-primary/10"><ArrowRight size={18} /></button></div>
					</div>
					<div className="mt-6" onTouchStart={handlePreviewTouchStart} onTouchEnd={handlePreviewTouchEnd}><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Actual page preview</p><MerchantPagePreview kind={step.preview} plans={plans} /></div>
					<p className="mt-6 max-w-3xl leading-7 text-gray-600 dark:text-gray-300">{step.description}</p>
					<ul className="mt-6 grid gap-3 lg:grid-cols-3">{step.checklist.map((item) => <li key={item} className="flex items-start gap-2 rounded-xl border border-primary/10 bg-primary/[0.04] p-3 text-sm text-gray-700 dark:text-gray-200"><BadgeCheck size={17} className="mt-0.5 shrink-0 text-emerald-500" aria-hidden="true" /><span>{item}</span></li>)}</ul>
					<div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5"><div className="flex items-center gap-1.5" aria-label={`Step ${activeStep + 1} of ${guideSteps.length}`}>{guideSteps.map((item, index) => <button type="button" key={item.label} onClick={() => setActiveStep(index)} aria-label={`Go to ${item.title}`} className={`h-2.5 rounded-full transition ${index === activeStep ? "w-8 bg-primary" : "w-2.5 bg-primary/20 hover:bg-primary/50"}`} />)}</div>{activeStep === guideSteps.length - 1 && <Link href="/onboarding" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:brightness-110">Create Store <ArrowRight size={16} aria-hidden="true" /></Link>}<span className="text-xs text-gray-500">Preview only — open the merchant workspace when you are ready to begin.</span></div>
				</article>
			</div>
			<p className="mt-5 text-center text-xs text-gray-500">The guide pauses while you interact with it and continues automatically after a short interval.</p>
		</section>
	)
}
