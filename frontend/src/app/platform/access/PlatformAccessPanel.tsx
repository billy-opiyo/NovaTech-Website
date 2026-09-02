"use client"

import { FormEvent, useEffect, useState } from "react"
import { Copy, LoaderCircle, MailPlus, ShieldCheck } from "lucide-react"

const roles = ["PLATFORM_ADMIN", "PLATFORM_SUPPORT", "PLATFORM_ANALYST"] as const
type PlatformRole = (typeof roles)[number]
type Admin = { id: string; name: string | null; email: string; role: string; platformRole: string | null; createdAt: string }
type Invitation = { id: string; email: string; role: string; expiresAt: string; createdAt: string; invitedBy: { name: string | null; email: string } }
type AccessData = { admins: Admin[]; invitations: Invitation[] }

function humanizeRole(role: string) {
	return role.replace("PLATFORM_", "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function PlatformAccessPanel() {
	const [data, setData] = useState<AccessData | null>(null)
	const [email, setEmail] = useState("")
	const [role, setRole] = useState<PlatformRole>("PLATFORM_ADMIN")
	const [inviteLink, setInviteLink] = useState("")
	const [message, setMessage] = useState("Loading platform access…")
	const [error, setError] = useState("")
	const [busy, setBusy] = useState(false)
	const [copied, setCopied] = useState(false)

	async function load() {
		const response = await fetch("/api/platform/access/invitations", { cache: "no-store" })
		const result = await response.json()
		if (!response.ok) throw new Error(result.message || "Platform access unavailable")
		setData(result)
	}

	useEffect(() => { load().then(() => setMessage("")).catch((reason) => setMessage(reason instanceof Error ? reason.message : "Platform access unavailable")) }, [])

	async function invite(event: FormEvent) {
		event.preventDefault(); setBusy(true); setError(""); setMessage(""); setInviteLink(""); setCopied(false)
		try {
			const response = await fetch("/api/platform/access/invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role }) })
			const result = await response.json().catch(() => ({}))
			if (!response.ok) { setError(result.message || "Unable to create platform invitation"); return }
			setInviteLink(result.inviteLink || "")
			setMessage("Invitation created. Send the link to the invited person through an approved channel.")
			setEmail("")
			await load()
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "Unable to create platform invitation")
		} finally {
			setBusy(false)
		}
	}

	async function copyInviteLink() {
		if (!inviteLink) return
		await navigator.clipboard.writeText(inviteLink)
		setCopied(true)
	}

	if (!data) return <div className="glass-card p-6"><p>{message}</p><p className="mt-2 text-sm text-amber-700">Platform access management is restricted to super administrators.</p></div>

	return <div className="space-y-6">
		<div><h2 className="text-3xl font-bold">Platform access</h2><p className="mt-2 text-gray-600 dark:text-gray-300">Invite trusted team members to the Nurava Tech control plane with the least privilege they need.</p></div>
		<form onSubmit={invite} className="glass-card space-y-4 p-6">
			<div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><MailPlus size={22} /></div><div><h3 className="text-xl font-semibold">Invite a platform operator</h3><p className="text-sm text-gray-500">The invitation expires after seven days and can only be accepted by the invited email.</p></div></div>
			<label className="block"><span className="text-sm font-medium">Email address</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" placeholder="operator@example.com" /></label>
			<label className="block"><span className="text-sm font-medium">Platform role</span><select value={role} onChange={(event) => setRole(event.target.value as PlatformRole)} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface">{roles.map((item) => <option key={item} value={item}>{humanizeRole(item)}</option>)}</select></label>
			<p className="text-xs text-gray-500">Platform Owner and Super Admin privileges remain reserved for existing super-administrator control.</p>
			{error && <p className="text-sm text-red-600">{error}</p>}{message && <p className="text-sm text-green-600">{message}</p>}
			{inviteLink && <div className="flex flex-col gap-2 sm:flex-row"><input readOnly value={inviteLink} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border p-3 text-sm dark:bg-dark-surface" aria-label="Platform invitation link" /><button type="button" onClick={() => void copyInviteLink()} className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"><Copy size={16} />{copied ? "Copied" : "Copy link"}</button></div>}
			<button disabled={busy} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50" type="submit">{busy && <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />} {busy ? "Creating invitation…" : "Create invitation"}</button>
		</form>
		<section className="glass-card p-6"><div className="flex items-center gap-3"><ShieldCheck className="text-primary" size={22} /><h3 className="text-xl font-semibold">Current platform access</h3></div>{data.admins.length ? <div className="mt-4 divide-y divide-gray-200 dark:divide-gray-700">{data.admins.map((admin) => <div key={admin.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{admin.name || "Unnamed user"}</p><p className="text-sm text-gray-500">{admin.email}</p></div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{admin.role === "SUPERADMIN" ? "Super Admin" : humanizeRole(admin.platformRole || "")}</span></div>)}</div> : <p className="mt-3 text-sm text-gray-500">No platform operators are assigned.</p>}</section>
		<section className="glass-card p-6"><h3 className="text-xl font-semibold">Pending invitations</h3>{data.invitations.length ? <div className="mt-4 divide-y divide-gray-200 dark:divide-gray-700">{data.invitations.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{item.email}</p><p className="text-sm text-gray-500">{humanizeRole(item.role)} · invited by {item.invitedBy.name || item.invitedBy.email}</p></div><p className="text-sm text-gray-500">Expires {new Date(item.expiresAt).toLocaleDateString()}</p></div>)}</div> : <p className="mt-3 text-sm text-gray-500">No pending platform invitations.</p>}</section>
	</div>
}
