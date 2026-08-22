import AdminLayout from "../admin/layout"
import { requireStoreSession } from "@/lib/tenant-auth"

export const metadata = {
	robots: { index: false, follow: false },
}

export default async function ManageLayout({ children }: { children: React.ReactNode }) {
	await requireStoreSession()
	return <AdminLayout>{children}</AdminLayout>
}
