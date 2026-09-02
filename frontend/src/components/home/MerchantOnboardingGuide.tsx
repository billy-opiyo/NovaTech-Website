"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, BadgeCheck, CheckCircle2, CircleDollarSign, LayoutDashboard, Palette, Package, Rocket, ShieldCheck, Store, UserPlus } from "lucide-react"

type GuideStep = {
	label: string
	title: string
	description: string
	checklist: string[]
	icon: typeof UserPlus
	href: string
	cta: string
}

const guideSteps: GuideStep[] = [
	{
		label: "Step 1 of 9",
		title: "Create your merchant account",
		description: "Start from Create Store, then sign in or create an account. This keeps your merchant workspace separate from the customer shopping experience.",
		checklist: ["Choose Create Store from the platform homepage", "Sign in or create your account", "Return to the store setup flow after authentication"],
		icon: UserPlus,
		href: "/onboarding",
		cta: "Start creating a store",
	},
	{
		label: "Step 2 of 9",
		title: "Choose a plan and accept the terms",
		description: "Select the plan that matches your expected catalogue and team size. Review the merchant terms and privacy notice before continuing.",
		checklist: ["Compare capacity, storage, staff, and domain features", "Review any setup fee and monthly subscription", "Accept the current merchant terms and privacy notice"],
		icon: CircleDollarSign,
		href: "/?platformHome=1#plans",
		cta: "Review plans",
	},
	{
		label: "Step 3 of 9",
		title: "Set your store identity",
		description: "Give the workspace its public name and an optional platform slug. The slug becomes the readable address customers can use to find your store.",
		checklist: ["Enter the public store name", "Choose a unique lowercase platform slug", "Create the store and open its merchant workspace"],
		icon: Store,
		href: "/onboarding",
		cta: "Open store setup",
	},
	{
		label: "Step 4 of 9",
		title: "Build the product catalogue",
		description: "Add the products customers will see, with accurate prices, stock, categories, variants, images, and descriptions. Larger catalogues can use import and export tools.",
		checklist: ["Create categories and products", "Add images, pricing, stock, and variants", "Review the catalogue before publishing"],
		icon: Package,
		href: "/manage/products",
		cta: "See catalogue tools",
	},
	{
		label: "Step 5 of 9",
		title: "Design the storefront",
		description: "Shape the public storefront around your brand. Save a draft, preview it, and provide the contact and shipping information shoppers need.",
		checklist: ["Choose a theme and update the homepage", "Add SEO, contact, WhatsApp, and business-hour details", "Set shipping defaults and preview the result"],
		icon: Palette,
		href: "/manage/design",
		cta: "Open store design",
	},
	{
		label: "Step 6 of 9",
		title: "Complete merchant verification",
		description: "Submit the business, contact, location, tax, M-Pesa ownership, phone, and required evidence details. Verification documents stay private for review.",
		checklist: ["Save your merchant and operating details", "Verify the merchant phone by SMS", "Upload the required evidence for review"],
		icon: ShieldCheck,
		href: "/manage/verification",
		cta: "Open verification",
	},
	{
		label: "Step 7 of 9",
		title: "Review subscription and M-Pesa billing",
		description: "Check the selected platform plan, setup fee, invoices, and payment history. Nurava Tech platform billing is handled separately from the payments a merchant arranges for product sales.",
		checklist: ["Review the active plan and setup fee", "Use the merchant phone for an M-Pesa request when payment is due", "Confirm invoice and payment status after provider confirmation"],
		icon: CircleDollarSign,
		href: "/manage/billing",
		cta: "Open subscription",
	},
	{
		label: "Step 8 of 9",
		title: "Pass launch readiness and publish",
		description: "Use the server-backed launch checklist to resolve anything still pending. Publish only after your store content, legal acceptance, verification, and access requirements are ready.",
		checklist: ["Review launch readiness checks", "Confirm the final draft and merchant responsibilities", "Publish the storefront and verify its public link"],
		icon: Rocket,
		href: "/manage/readiness",
		cta: "Check launch readiness",
	},
	{
		label: "Step 9 of 9",
		title: "Operate, support, and grow",
		description: "After launch, your workspace is the control centre for the store. Keep the catalogue current and follow customer activity, enquiries, reviews, deliveries, team access, and analytics.",
		checklist: ["Manage orders, enquiries, customers, and deliveries", "Review and respond to customer feedback", "Use analytics, support, settings, and domains as the store grows"],
		icon: LayoutDashboard,
		href: "/manage/dashboard",
		cta: "Open merchant workspace",
	},
]

export default function MerchantOnboardingGuide() {
	const [activeStep, setActiveStep] = useState(0)
	const [paused, setPaused] = useState(false)
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

	return (
		<section aria-labelledby="merchant-onboarding-guide-title" className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.1] via-transparent to-accent/[0.08] p-5 shadow-xl sm:p-8" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false) }}>
			<div className="mx-auto max-w-3xl text-center">
				<p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">For store partners</p>
				<h2 id="merchant-onboarding-guide-title" className="mt-2 text-3xl font-extrabold sm:text-4xl">Onboarding Merchant Guide</h2>
				<p className="mt-3 text-gray-600 dark:text-gray-300">Follow the complete path from creating your merchant account to launching and running a customer-ready store.</p>
			</div>

			<div className="mt-8 grid gap-6 lg:grid-cols-[minmax(12rem,0.7fr)_minmax(0,1.7fr)]">
				<nav aria-label="Merchant onboarding steps" className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-1 lg:gap-1">
					{guideSteps.map((item, index) => <button type="button" key={item.label} onClick={() => setActiveStep(index)} aria-current={index === activeStep ? "step" : undefined} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${index === activeStep ? "bg-primary text-white shadow-md" : "text-gray-600 hover:bg-primary/10 dark:text-gray-300"}`}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index === activeStep ? "bg-white/20" : "bg-primary/10 text-primary"}`}>{index < activeStep ? <CheckCircle2 size={15} aria-hidden="true" /> : index + 1}</span><span className="hidden sm:inline lg:inline">{item.title}</span></button>)}
				</nav>

				<article aria-live="polite" className="glass-card min-w-0 overflow-hidden border border-white/20 p-5 sm:p-7">
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div className="flex min-w-0 items-center gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><StepIcon size={28} aria-hidden="true" /></div><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">{step.label}</p><h3 className="mt-1 text-2xl font-extrabold">{step.title}</h3></div></div>
						<div className="flex items-center gap-2" aria-label="Guide controls"><button type="button" onClick={() => moveBy(-1)} aria-label="Previous onboarding step" className="rounded-full border p-2 text-primary transition hover:bg-primary/10"><ArrowLeft size={18} /></button><button type="button" onClick={() => moveBy(1)} aria-label="Next onboarding step" className="rounded-full border p-2 text-primary transition hover:bg-primary/10"><ArrowRight size={18} /></button></div>
					</div>
					<p className="mt-6 max-w-3xl leading-7 text-gray-600 dark:text-gray-300">{step.description}</p>
					<ul className="mt-6 grid gap-3 sm:grid-cols-3">{step.checklist.map((item) => <li key={item} className="flex items-start gap-2 rounded-xl border border-primary/10 bg-primary/[0.04] p-3 text-sm text-gray-700 dark:text-gray-200"><BadgeCheck size={17} className="mt-0.5 shrink-0 text-emerald-500" aria-hidden="true" /><span>{item}</span></li>)}</ul>
					<div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5"><div className="flex items-center gap-1.5" aria-label={`Step ${activeStep + 1} of ${guideSteps.length}`}>{guideSteps.map((item, index) => <button type="button" key={item.label} onClick={() => setActiveStep(index)} aria-label={`Go to ${item.title}`} className={`h-2.5 rounded-full transition ${index === activeStep ? "w-8 bg-primary" : "w-2.5 bg-primary/20 hover:bg-primary/50"}`} />)}</div><Link href={step.href} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:brightness-110">{step.cta} <ArrowRight size={16} /></Link></div>
				</article>
			</div>
			<p className="mt-5 text-center text-xs text-gray-500">The guide pauses while you interact with it and continues automatically after a short interval.</p>
		</section>
	)
}
