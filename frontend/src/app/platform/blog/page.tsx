import { redirect } from "next/navigation"
import BlogManager from "@/components/manage/BlogManager"
import { requirePlatformSession } from "@/lib/tenant-auth"

export default async function PlatformBlogAdminPage() {
	const session = await requirePlatformSession()
	if (session.user.role !== "SUPERADMIN" && !["PLATFORM_OWNER", "PLATFORM_ADMIN"].includes(session.user.platformRole || "")) redirect("/platform")
	return <BlogManager endpoint="/api/platform/blog" heading="Platform blog" />
}
