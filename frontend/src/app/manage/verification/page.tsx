"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"

type FormState = { businessType: string; taxStatus: string; locationType: string; settlementAccountType: string; legalName: string; phone: string; businessRegistrationNumber: string; taxIdentifier: string; county: string; town: string; addressLine: string; settlementAccountNumber: string; settlementAccountName: string }
type Evidence = { id: string; type: string; status: string; contentType: string; sizeBytes: number; reviewedAt: string | null; reviewNote: string | null; createdAt: string }
type Verification = { verificationStatus: string; verificationSubmittedAt: string | null; verificationReviewedAt: string | null; verificationNotes: string | null; verificationProfile: { businessType: string; taxStatus: string; locationType: string; settlementAccountType: string; phoneVerifiedAt: string | null; updatedAt: string } | null; verificationEvidence: Evidence[] }

const emptyForm: FormState = { businessType: "INDIVIDUAL", taxStatus: "NOT_REGISTERED", locationType: "PHYSICAL_LOCATION", settlementAccountType: "PAYBILL", legalName: "", phone: "", businessRegistrationNumber: "", taxIdentifier: "", county: "", town: "", addressLine: "", settlementAccountNumber: "", settlementAccountName: "" }
const labels: Record<string, string> = { GOVERNMENT_ID: "Government-issued ID", BUSINESS_REGISTRATION: "Business registration", KRA_PIN: "KRA PIN evidence", LOCATION_PROOF: "Location proof", MPESA_OWNERSHIP: "M-Pesa ownership", OWNER_DECLARATION: "Owner declaration" }

function humanize(value: string) { return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) }
function requiredEvidence(form: FormState) { return ["GOVERNMENT_ID", "LOCATION_PROOF", "MPESA_OWNERSHIP", form.businessType === "REGISTERED_BUSINESS" ? "BUSINESS_REGISTRATION" : "OWNER_DECLARATION", ...(form.taxStatus === "REGISTERED" ? ["KRA_PIN"] : [])] }

export default function MerchantVerificationPage() {
	const [verification, setVerification] = useState<Verification | null>(null)
	const [form, setForm] = useState<FormState>(emptyForm)
	const [evidenceType, setEvidenceType] = useState("GOVERNMENT_ID")
	const [code, setCode] = useState("")
	const [message, setMessage] = useState("Loading verification status…")
	const [busy, setBusy] = useState(false)

	async function load() {
		const response = await fetch("/api/manage/verification", { cache: "no-store" })
		const data = await response.json().catch(() => ({}))
		if (!response.ok) throw new Error(data.message || "Verification status unavailable")
		setVerification(data.verification)
		if (data.verification.verificationProfile) setForm((current) => ({ ...current, businessType: data.verification.verificationProfile.businessType, taxStatus: data.verification.verificationProfile.taxStatus, locationType: data.verification.verificationProfile.locationType, settlementAccountType: data.verification.verificationProfile.settlementAccountType }))
		setMessage("")
	}

	useEffect(() => { load().catch((error) => setMessage(error.message)) }, [])

	const required = useMemo(() => requiredEvidence(form), [form])
	const uploaded = new Set((verification?.verificationEvidence || []).filter((item) => item.status !== "REJECTED").map((item) => item.type))

	async function saveProfile(event?: FormEvent) {
		event?.preventDefault()
		setBusy(true)
		setMessage("")
		try {
			const response = await fetch("/api/manage/verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
			const data = await response.json().catch(() => ({}))
			if (!response.ok && !["PHONE_VERIFICATION_REQUIRED", "EVIDENCE_REQUIRED"].includes(data.code)) throw new Error(data.message || "Unable to save verification details")
			setMessage(data.message || "Verification details saved.")
			await load()
		} catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Unable to save verification details") } finally { setBusy(false) }
	}

	async function requestPhoneCode() {
		setBusy(true)
		try { const response = await fetch("/api/manage/verification/phone", { method: "POST" }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.message || "Unable to send code"); setMessage(data.message) } catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Unable to send code") } finally { setBusy(false) }
	}

	async function confirmPhoneCode() {
		setBusy(true)
		try { const response = await fetch("/api/manage/verification/phone", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.message || "Unable to verify phone"); setMessage(data.message); setCode(""); await load() } catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Unable to verify phone") } finally { setBusy(false) }
	}

	async function uploadEvidence(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0]
		if (!file) return
		setBusy(true)
		try { const body = new FormData(); body.set("type", evidenceType); body.set("file", file); const response = await fetch("/api/manage/verification/evidence", { method: "POST", body }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.message || "Unable to upload document"); setMessage(`${labels[evidenceType]} uploaded for review.`); await load() } catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Unable to upload document") } finally { setBusy(false); event.target.value = "" }
	}

	if (message && !verification) return <div className="glass-card p-6"><p>{message}</p></div>
	if (!verification) return null
	const approved = verification.verificationStatus === "APPROVED"
	const pending = verification.verificationStatus === "PENDING_REVIEW"
	const phoneVerified = Boolean(verification.verificationProfile?.phoneVerifiedAt)
	return <div className="space-y-6">
		<div><h1 className="text-3xl font-bold">Merchant verification</h1><p className="mt-1 text-gray-500">Complete these checks before your store can be published or sell.</p></div>
		{message && <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{message}</div>}
		<section className="glass-card p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-gray-500">Current status</p><h2 className="mt-1 text-2xl font-semibold">{humanize(verification.verificationStatus)}</h2></div><span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">{approved ? "Approved" : pending ? "Awaiting review" : "Action required"}</span></div><p className="mt-4 text-sm text-gray-600">Your phone, identity, tax, location, and merchant-owned M-Pesa information are collected for verification. Documents are stored privately and are not shown on your storefront.</p>{verification.verificationNotes && <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">Reviewer note: {verification.verificationNotes}</p>}</section>
		<form onSubmit={(event) => void saveProfile(event)} className="glass-card grid gap-4 p-6 md:grid-cols-2"><h2 className="text-xl font-semibold md:col-span-2">Merchant details</h2>
			<label className="grid gap-1 text-sm">Merchant type<select value={form.businessType} onChange={(event) => setForm({ ...form, businessType: event.target.value })} className="rounded-lg border p-2.5"><option value="INDIVIDUAL">Individual</option><option value="REGISTERED_BUSINESS">Registered business</option></select></label>
			<label className="grid gap-1 text-sm">Tax status<select value={form.taxStatus} onChange={(event) => setForm({ ...form, taxStatus: event.target.value })} className="rounded-lg border p-2.5"><option value="REGISTERED">Registered / has KRA PIN</option><option value="NOT_REGISTERED">Not currently registered</option><option value="NOT_APPLICABLE">Not applicable</option><option value="UNDER_REVIEW">Needs review</option></select></label>
			<label className="grid gap-1 text-sm">Legal name<input required value={form.legalName} onChange={(event) => setForm({ ...form, legalName: event.target.value })} className="rounded-lg border p-2.5" /></label>
			<label className="grid gap-1 text-sm">Merchant phone<input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="0712 345 678" className="rounded-lg border p-2.5" /></label>
			{form.businessType === "REGISTERED_BUSINESS" && <label className="grid gap-1 text-sm">Business registration number<input required value={form.businessRegistrationNumber} onChange={(event) => setForm({ ...form, businessRegistrationNumber: event.target.value })} className="rounded-lg border p-2.5" /></label>}
			{form.taxStatus === "REGISTERED" && <label className="grid gap-1 text-sm">KRA PIN<input required value={form.taxIdentifier} onChange={(event) => setForm({ ...form, taxIdentifier: event.target.value })} className="rounded-lg border p-2.5" /></label>}
			<label className="grid gap-1 text-sm">Location type<select value={form.locationType} onChange={(event) => setForm({ ...form, locationType: event.target.value })} className="rounded-lg border p-2.5"><option value="PHYSICAL_LOCATION">Physical business location</option><option value="ONLINE_ONLY">Online-only / operating address</option></select></label>
			<label className="grid gap-1 text-sm">County<input required value={form.county} onChange={(event) => setForm({ ...form, county: event.target.value })} className="rounded-lg border p-2.5" /></label>
			<label className="grid gap-1 text-sm">Town<input required value={form.town} onChange={(event) => setForm({ ...form, town: event.target.value })} className="rounded-lg border p-2.5" /></label>
			<label className="grid gap-1 text-sm md:col-span-2">Full operating/location address<input required value={form.addressLine} onChange={(event) => setForm({ ...form, addressLine: event.target.value })} className="rounded-lg border p-2.5" /></label>
			<label className="grid gap-1 text-sm">M-Pesa account type<select value={form.settlementAccountType} onChange={(event) => setForm({ ...form, settlementAccountType: event.target.value })} className="rounded-lg border p-2.5"><option value="PAYBILL">Paybill</option><option value="TILL">Till</option><option value="OTHER">Other business account</option></select></label>
			<label className="grid gap-1 text-sm">M-Pesa account number<input required value={form.settlementAccountNumber} onChange={(event) => setForm({ ...form, settlementAccountNumber: event.target.value })} className="rounded-lg border p-2.5" /></label>
			<label className="grid gap-1 text-sm">M-Pesa account name<input required value={form.settlementAccountName} onChange={(event) => setForm({ ...form, settlementAccountName: event.target.value })} className="rounded-lg border p-2.5" /></label>
			<button disabled={busy || approved || pending} className="btn-primary md:col-span-2 disabled:opacity-50">{busy ? "Saving…" : "Save details and continue"}</button>
		</form>
		<section className="glass-card p-6"><h2 className="text-xl font-semibold">Phone verification</h2><p className="mt-2 text-sm text-gray-600">{phoneVerified ? "Merchant phone verified." : "Save your details, then request a six-digit code by SMS."}</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={busy || phoneVerified} onClick={() => void requestPhoneCode()} className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50">Send code</button><input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" maxLength={6} placeholder="6-digit code" className="w-36 rounded-lg border p-2" /><button type="button" disabled={busy || phoneVerified || code.length !== 6} onClick={() => void confirmPhoneCode()} className="btn-primary disabled:opacity-50">Verify phone</button></div></section>
		<section className="glass-card p-6"><h2 className="text-xl font-semibold">Verification documents</h2><p className="mt-2 text-sm text-gray-600">PDF, JPG, PNG, or WEBP only; maximum 10MB. Upload documents privately. Do not upload passwords, M-Pesa PINs, or unrelated personal files.</p><div className="mt-4 flex flex-wrap items-end gap-3"><label className="grid gap-1 text-sm">Document type<select value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)} className="rounded-lg border p-2.5">{Array.from(new Set([...required, ...Object.keys(labels)])).map((type) => <option key={type} value={type}>{labels[type]}</option>)}</select></label><label className="btn-primary inline-flex cursor-pointer items-center"><span>{busy ? "Uploading…" : "Choose document"}</span><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={uploadEvidence} disabled={busy || approved} className="sr-only" /></label></div><div className="mt-5 divide-y">{verification.verificationEvidence.map((item) => <div className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm" key={item.id}><span><b>{labels[item.type] || humanize(item.type)}</b><span className="ml-2 text-xs text-gray-500">{(item.sizeBytes / 1024 / 1024).toFixed(2)}MB</span></span><span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.status === "APPROVED" ? "bg-green-100 text-green-800" : item.status === "REJECTED" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{humanize(item.status)}</span></div>)}{!verification.verificationEvidence.length && <p className="py-4 text-sm text-gray-500">No documents uploaded yet.</p>}</div><div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">{required.map((type) => <span key={type} className={`rounded-full px-2 py-1 ${uploaded.has(type) ? "bg-green-100 text-green-800" : "bg-gray-100"}`}>{uploaded.has(type) ? "✓" : "○"} {labels[type]}</span>)}</div></section>
		<button type="button" disabled={busy || approved || pending} onClick={() => void saveProfile()} className="btn-primary w-fit disabled:opacity-50">{pending ? "Awaiting review" : approved ? "Approved" : "Submit for Nurava review"}</button>
	</div>
}
