import { requirePlatformSupportSession } from "@/lib/tenant-auth"
import PlatformMessagesPanel from "./PlatformMessagesPanel"

export const metadata = {
	robots: { index: false, follow: false },
}

export default async function PlatformMessagesPage() {
	await requirePlatformSupportSession()
	return <PlatformMessagesPanel />
}
