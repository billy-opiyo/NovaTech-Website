import { redirect } from "next/navigation"
import { requirePlatformSession } from "@/lib/tenant-auth"
import PlatformSiteSettingsPanel from "./PlatformSiteSettingsPanel"

export default async function PlatformSettingsPage() {
	const session = await requirePlatformSession()
	if (session.user.role !== "SUPERADMIN") redirect("/platform")
	return <PlatformSiteSettingsPanel />
}
