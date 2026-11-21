"use client"

import { FormEvent, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/Toast"

type Invitation = { id: string; email: string; role: string; expiresAt: string; createdAt: string }
type Member = { id: string; role: string; active: boolean; extraPermissions: string[]; rolePermissions: string[]; user: { id: string; name: string | null; email: string } }
const roles = ["STORE_ADMIN", "STORE_MANAGER", "STORE_SUPPORT", "STORE_EDITOR"] as const

export default function TeamPage() {
	const [email, setEmail] = useState("")
	const [role, setRole] = useState<(typeof roles)[number]>("STORE_EDITOR")
	const [invitations, setInvitations] = useState<Invitation[]>([])
	const [members, setMembers] = useState<Member[]>([])
	const [canManageAccess, setCanManageAccess] = useState(false)
	const [inviteLink, setInviteLink] = useState("")
	const [message, setMessage] = useState("")
	const [error, setError] = useState("")
	const { addToast } = useToast()
	const [busy, setBusy] = useState(false)
	const [updatingMember, setUpdatingMember] = useState("")
	const [savingPermissions, setSavingPermissions] = useState("")

	async function load() {
		const response = await fetch("/api/manage/team/invitations", { cache: "no-store" })
		if (response.ok) {
			const data = await response.json()
			setInvitations(data.invitations || [])
			setMembers(data.members || [])
			setCanManageAccess(Boolean(data.canManageAccess))
		}
	}

	useEffect(() => { void load() }, [])

	async function invite(event: FormEvent) {
		event.preventDefault(); setMessage(""); setError(""); setInviteLink(""); setBusy(true)
		try {
			const response = await fetch("/api/manage/team/invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role }) })
			const data = await response.json().catch(() => ({}))
			if (!response.ok) { const message = data.message || "Unable to create invitation"; setError(message); addToast(message, "error") }
			else { setInviteLink(data.inviteLink); setMessage("Invitation created. Copy the link and send it to the invited person through an approved channel."); addToast("Team invitation created successfully.", "success"); setEmail(""); await load() }
		} catch { setError("Unable to create invitation"); addToast("Unable to create invitation", "error") }
		finally { setBusy(false) }
	}

	async function toggleMember(member: Member) {
		setUpdatingMember(member.id)
		try {
			const response = await fetch("/api/manage/team/members", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ membershipId: member.id, enabled: !member.active }) })
			const data = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(data.message || "Unable to update team access")
			addToast(`${member.user.email} access ${member.active ? "disabled" : "enabled"}.`, "success")
			await load()
		} catch (reason) { addToast(reason instanceof Error ? reason.message : "Unable to update team access", "error") }
		finally { setUpdatingMember("") }
	}

	function togglePermission(member: Member, permission: string) {
		setMembers((current) => current.map((item) => item.id === member.id ? { ...item, extraPermissions: item.extraPermissions.includes(permission) ? item.extraPermissions.filter((entry) => entry !== permission) : [...item.extraPermissions, permission] } : item))
	}

	async function savePermissions(member: Member) {
		setSavingPermissions(member.id)
		try {
			const response = await fetch("/api/manage/team/members", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ membershipId: member.id, extraPermissions: member.extraPermissions }) })
			const data = await response.json().catch(() => ({}))
			if (!response.ok) throw new Error(data.message || "Unable to save operation access")
			addToast(`Operation access saved for ${member.user.email}.`, "success")
			await load()
		} catch (reason) { addToast(reason instanceof Error ? reason.message : "Unable to save operation access", "error") }
		finally { setSavingPermissions("") }
	}

	return <div className="space-y-6">
		<div><h1 className="text-3xl font-bold">Team access</h1><p className="mt-1 text-gray-500">Invite store staff with the least privilege they need. Email delivery is not configured, so links are shown for manual delivery.</p></div>
		<form onSubmit={invite} className="glass-card space-y-4 p-6">
			<label className="block"><span className="text-sm font-medium">Staff email</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface" placeholder="staff@example.com" /></label>
			<label className="block"><span className="text-sm font-medium">Store role</span><select value={role} onChange={(event) => setRole(event.target.value as (typeof roles)[number])} className="mt-2 w-full rounded-lg border p-3 dark:bg-dark-surface">{roles.map((item) => <option key={item} value={item}>{item.replace("STORE_", "").replaceAll("_", " ")}</option>)}</select></label>
			{error && <p className="text-sm text-red-600">{error}</p>}{message && <p className="text-sm text-green-600">{message}</p>}
			{inviteLink && <label className="block"><span className="text-sm font-medium">One-time invite link</span><input readOnly value={inviteLink} onFocus={(event) => event.currentTarget.select()} className="mt-2 w-full rounded-lg border p-3 text-sm dark:bg-dark-surface" /></label>}
			<button className="btn-primary inline-flex items-center gap-2 disabled:opacity-50" type="submit" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}{busy ? "Creating…" : "Create invitation"}</button>
		</form>
		<section className="glass-card p-6"><h2 className="text-xl font-bold">Pending invitations</h2>{invitations.length === 0 ? <p className="mt-3 text-sm text-gray-500">No pending invitations.</p> : <div className="mt-4 divide-y divide-gray-200 dark:divide-gray-700">{invitations.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{item.email}</p><p className="text-sm text-gray-500">{item.role.replace("STORE_", "").replaceAll("_", " ")}</p></div><p className="text-sm text-gray-500">Expires {new Date(item.expiresAt).toLocaleDateString()}</p></div>)}</div>}</section>
		<section className="glass-card p-6"><h2 className="text-xl font-bold">Store team access</h2><p className="mt-1 text-sm text-gray-500">The store owner can enable or disable access and grant additional operations. Role permissions are included by default.</p>{members.length === 0 ? <p className="mt-3 text-sm text-gray-500">No accepted team members yet.</p> : <div className="mt-4 divide-y divide-gray-200 dark:divide-gray-700">{members.map((member) => { const extraOptions = ["MANAGE_STORE_SETTINGS", "PUBLISH_STORE", "MANAGE_DOMAINS", "MANAGE_VERIFICATION", "MANAGE_TEAM", "MANAGE_BILLING", "EXPORT_DATA", "MANAGE_CATALOG", "DELETE_CATALOG", "VIEW_ORDERS", "UPDATE_ORDERS", "VIEW_CUSTOMERS", "MANAGE_COUPONS", "DELETE_COUPONS", "MODERATE_REVIEWS", "VIEW_ANALYTICS", "MANAGE_SUPPORT", "MANAGE_ENQUIRIES", "CREATE_QUOTES", "VIEW_AUDIT_LOGS"].filter((permission) => !member.rolePermissions.includes(permission)); return <div key={member.id} className="py-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{member.user.name || member.user.email}</p><p className="text-sm text-gray-500">{member.user.email} · {member.role.replace("STORE_", "").replaceAll("_", " ")}</p></div><label className="inline-flex items-center gap-2 text-sm"><span>{member.active ? "Enabled" : "Disabled"}</span><input type="checkbox" role="switch" aria-label={`${member.active ? "Disable" : "Enable"} access for ${member.user.email}`} checked={member.active} disabled={!canManageAccess || member.role === "STORE_OWNER" || updatingMember === member.id} onChange={() => void toggleMember(member)} className="h-5 w-5 accent-primary" />{updatingMember === member.id && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}</label></div>{member.role !== "STORE_OWNER" && <details open className="mt-3"><summary className="cursor-pointer text-sm font-medium">Grant additional operations</summary><div className="mt-3 grid gap-2 sm:grid-cols-2">{member.rolePermissions.map((permission) => <label key={permission} className="flex items-center gap-2 text-sm text-gray-500"><input type="checkbox" checked disabled className="h-4 w-4"/><span>{permission.replaceAll("_", " ")} · included by role</span></label>)}{extraOptions.map((permission) => <label key={permission} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={member.extraPermissions.includes(permission)} disabled={!canManageAccess || savingPermissions === member.id} onChange={() => togglePermission(member, permission)} className="h-4 w-4 accent-primary"/><span>{permission.replaceAll("_", " ")}</span></label>)}</div><button type="button" disabled={!canManageAccess || savingPermissions === member.id} onClick={() => void savePermissions(member)} className="btn-primary mt-3 rounded-lg px-3 py-2 text-xs">{savingPermissions === member.id ? "Saving…" : "Save operation access"}</button></details>}</div> })}</div>}</section>
	</div>
}
