import AdminLayout from "../admin/layout"
import { requireStoreSession } from "@/lib/tenant-auth"

export default async function ManageLayout({ children }: { children: React.ReactNode }) {
	await requireStoreSession()
	return <AdminLayout basePath="/manage">{children}</AdminLayout>
}
