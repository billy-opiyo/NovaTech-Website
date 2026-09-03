"use client"

import { FormEvent, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/Toast"

type Invitation = { id: string; email: string; role: string; expiresAt: string; createdAt: string }
const roles = ["STORE_ADMIN", "STORE_MANAGER", "STORE_SUPPORT", "STORE_EDITOR"] as const

export default function TeamPage() {
	const [email, setEmail] = useState("")
	const [role, setRole] = useState<(typeof roles)[number]>("STORE_EDITOR")
	const [invitations, setInvitations] = useState<Invitation[]>([])
	const [inviteLink, setInviteLink] = useState("")
	const [message, setMessage] = useState("")
	const [error, setError] = useState("")
	const { addToast } = useToast()
	const [busy, setBusy] = useState(false)

	async function load() {
		const response = await fetch("/api/manage/team/invitations", { cache: "no-store" })
		if (response.ok) setInvitations((await response.json()).invitations || [])
	}

	useEffect(() => { void load() }, [])

	async function invite(event: FormEvent) {
		event.preventDefault(); setMessage(""); setError(""); setInviteLink(""); setBusy(true)
		try { const response = await fetch("/api/manage/team/invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role }) }); const data = await response.json().catch(() => ({})); if (!response.ok) { const message = data.message || "Unable to create invitation"; setError(message); addToast(message, "error") } else { setInviteLink(data.inviteLink); setMessage("Invitation created. Copy the link and send it to the invited person through an approved channel."); addToast("Team invitation created successfully.", "success"); setEmail(""); await load() } } catch { setError("Unable to create invitation"); addToast("Unable to create invitation", "error") } finally { setBusy(false) }
	}

	return <div className="space-y-6"><div><h1 className="text-3xl font-bold">Team access</h1><p className="mt-1 text-gray-500">Invite store staff with the least privilege they need. Email delivery is not configured, so links are shown once for manual delivery.</p></div><form onSubmit={invite} className="glass-card space-y-4 p-6"><label className="block"><span className="text-sm font-medium">Staff email</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" placeholder="staff@example.com" /></label><label className="block"><span className="text-sm font-medium">Store role</span><select value={role} onChange={(event) => setRole(event.target.value as (typeof roles)[number])} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface">{roles.map((item) => <option key={item} value={item}>{item.replace("STORE_", "").replaceAll("_", " ")}</option>)}</select></label>{error && <p className="text-sm text-red-600">{error}</p>}{message && <p className="text-sm text-green-600">{message}</p>}{inviteLink && <label className="block"><span className="text-sm font-medium">One-time invite link</span><input readOnly value={inviteLink} onFocus={(event) => event.currentTarget.select()} className="mt-2 w-full rounded-lg border p-3 text-sm dark:bg-dark-surface" /></label>}<button className="btn-primary inline-flex items-center gap-2 disabled:opacity-50" type="submit" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}{busy ? "Creating…" : "Create invitation"}</button></form><section className="glass-card p-6"><h2 className="text-xl font-bold">Pending invitations</h2>{invitations.length === 0 ? <p className="mt-3 text-sm text-gray-500">No pending invitations.</p> : <div className="mt-4 divide-y divide-gray-200 dark:divide-gray-700">{invitations.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{item.email}</p><p className="text-sm text-gray-500">{item.role.replace("STORE_", "").replaceAll("_", " ")}</p></div><p className="text-sm text-gray-500">Expires {new Date(item.expiresAt).toLocaleDateString()}</p></div>)}</div>}</section></div>
}
