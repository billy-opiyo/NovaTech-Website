import { redirect } from "next/navigation"
import { requirePlatformSession } from "@/lib/tenant-auth"
import PlatformAccessPanel from "./PlatformAccessPanel"

export default async function PlatformAccessPage() {
	const session = await requirePlatformSession()
	if (session.user.role !== "SUPERADMIN") redirect("/platform")
	return <PlatformAccessPanel />
}
