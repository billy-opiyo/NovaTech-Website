"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useToast } from "@/components/ui/Toast"

type Evidence = { id: string; type: string; status: string; contentType: string; sizeBytes: number; reviewedAt: string | null; reviewNote: string | null; createdAt: string }
type ReviewData = { tenant: { id: string; legalName: string | null; status: string; verificationStatus: string; verificationSubmittedAt: string | null; verificationReviewedAt: string | null; verificationNotes: string | null; verificationProfile: { businessType: string; taxStatus: string; locationType: string; settlementAccountType: string; phoneVerifiedAt: string | null; updatedAt: string; details: Record<string, string> } | null; verificationEvidence: Evidence[] } }
const labels: Record<string, string> = { GOVERNMENT_ID: "Government-issued ID", BUSINESS_REGISTRATION: "Business registration", KRA_PIN: "KRA PIN evidence", LOCATION_PROOF: "Location proof", MPESA_OWNERSHIP: "M-Pesa ownership", OWNER_DECLARATION: "Owner declaration" }

function humanize(value: string) { return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) }
function mask(value?: string) { if (!value) return "—"; return value.length <= 4 ? "••••" : `${"•".repeat(Math.min(8, value.length - 3))}${value.slice(-3)}` }

export default function VerificationReviewPage() {
	const params = useParams<{ tenantId: string }>()
	const tenantId = params.tenantId
	const [data, setData] = useState<ReviewData | null>(null)
	const [message, setMessage] = useState("Loading verification review…")
	const [busy, setBusy] = useState<string | null>(null)
	const { addToast } = useToast()

	async function load() {
		const response = await fetch(`/api/platform/verification/${tenantId}`, { cache: "no-store" })
		const result = await response.json().catch(() => ({}))
		if (!response.ok) throw new Error(result.message || "Verification review unavailable")
		setData(result)
		setMessage("")
	}

	useEffect(() => { if (tenantId) load().catch((error) => setMessage(error.message)) }, [tenantId])

	async function reviewEvidence(evidenceId: string, status: string) {
		setBusy(evidenceId)
		try { const response = await fetch(`/api/platform/verification/${tenantId}/evidence/${evidenceId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.message || "Unable to review evidence"); await load(); addToast(`Evidence ${status.toLowerCase()} successfully.`, "success") } catch (error: any) { const message = error.message || "Unable to review evidence"; setMessage(message); addToast(message, "error") } finally { setBusy(null) }
	}

	async function downloadEvidence(evidenceId: string) {
		setBusy(evidenceId)
		try { const response = await fetch(`/api/platform/verification/${tenantId}/evidence/${evidenceId}`); const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.message || "Unable to open evidence"); window.open(result.downloadUrl, "_blank", "noopener,noreferrer") } catch (error: any) { setMessage(error.message || "Unable to open evidence") } finally { setBusy(null) }
	}

	async function changeTenant(action: "approve_verification" | "reject_verification") {
		setBusy(action)
		try { const response = await fetch("/api/platform/operations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, tenantId }) }); const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.message || "Unable to update merchant status"); await load(); addToast("Merchant status updated successfully.", "success") } catch (error: any) { const message = error.message || "Unable to update merchant status"; setMessage(message); addToast(message, "error") } finally { setBusy(null) }
	}

	if (!data) return <div className="glass-card p-6"><p>{message}</p></div>
	const profile = data.tenant.verificationProfile
	const details = profile?.details || {}
	return <div className="space-y-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-gray-500">Merchant verification review</p><h1 className="text-3xl font-bold">{data.tenant.legalName || data.tenant.id}</h1><p className="mt-1 text-gray-500">Status: {humanize(data.tenant.verificationStatus)}</p></div><div className="flex gap-2"><button disabled={busy !== null} onClick={() => void changeTenant("reject_verification")} className="destructive-action rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50">Reject</button><button disabled={busy !== null} onClick={() => void changeTenant("approve_verification")} className="btn-primary disabled:opacity-50">Approve merchant</button></div></div>{message && <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}
		<section className="glass-card p-6"><h2 className="text-xl font-semibold">Submitted details</h2>{profile ? <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><p><b>Business type:</b> {humanize(profile.businessType)}</p><p><b>Tax status:</b> {humanize(profile.taxStatus)}</p><p><b>Location type:</b> {humanize(profile.locationType)}</p><p><b>Settlement:</b> {humanize(profile.settlementAccountType)}</p><p><b>Phone:</b> {mask(details.phone)} {profile.phoneVerifiedAt ? "(verified)" : "(not verified)"}</p><p><b>Legal name:</b> {details.legalName || "—"}</p><p><b>County / town:</b> {details.county || "—"} / {details.town || "—"}</p><p><b>Address:</b> {details.addressLine || "—"}</p><p><b>Registration:</b> {details.businessRegistrationNumber || "—"}</p><p><b>KRA PIN:</b> {mask(details.taxIdentifier)}</p><p><b>M-Pesa account:</b> {mask(details.settlementAccountNumber)}</p><p><b>M-Pesa name:</b> {details.settlementAccountName || "—"}</p></div> : <p className="mt-3 text-sm text-gray-500">No verification profile submitted.</p>}</section>
		<section className="glass-card p-6"><h2 className="text-xl font-semibold">Evidence</h2><div className="mt-4 divide-y">{data.tenant.verificationEvidence.map((item) => <div className="flex flex-wrap items-center justify-between gap-3 py-4" key={item.id}><div><p className="font-semibold">{labels[item.type] || humanize(item.type)}</p><p className="text-xs text-gray-500">{item.contentType} · {(item.sizeBytes / 1024 / 1024).toFixed(2)}MB · {humanize(item.status)}</p>{item.reviewNote && <p className="text-xs text-red-700">Note: {item.reviewNote}</p>}</div><div className="flex flex-wrap gap-2"><button disabled={busy !== null} onClick={() => void downloadEvidence(item.id)} className="rounded border px-3 py-1 text-xs font-semibold disabled:opacity-50">Open privately</button><button disabled={busy !== null} onClick={() => void reviewEvidence(item.id, "REJECTED")} className="destructive-action rounded border px-3 py-1 text-xs font-semibold disabled:opacity-50">Reject</button><button disabled={busy !== null} onClick={() => void reviewEvidence(item.id, "APPROVED")} className="rounded border border-green-600 px-3 py-1 text-xs font-semibold text-green-700 disabled:opacity-50">Approve</button></div></div>)}{!data.tenant.verificationEvidence.length && <p className="py-4 text-sm text-gray-500">No evidence uploaded.</p>}</div></section>
	</div>
}
