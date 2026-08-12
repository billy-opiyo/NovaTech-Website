import Link from "next/link"

export default function NotificationsPage() {
	return <div className="mx-auto max-w-2xl py-12"><div className="glass-card p-8"><h1 className="mb-2 text-2xl font-bold">Notifications</h1><p className="mb-6 text-gray-500">Your order and account notifications will appear here.</p><Link href="/account" className="btn-primary inline-flex">Back to account</Link></div></div>
}
