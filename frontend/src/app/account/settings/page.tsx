import Link from "next/link"

export default function AccountSettingsPage() {
	return <div className="mx-auto max-w-2xl py-12"><div className="glass-card p-8"><h1 className="mb-2 text-2xl font-bold">Account settings</h1><p className="mb-6 text-gray-500">Update your profile and account preferences here.</p><Link href="/account" className="btn-primary inline-flex">Back to account</Link></div></div>
}
