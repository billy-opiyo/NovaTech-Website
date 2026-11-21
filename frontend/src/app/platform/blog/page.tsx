import { redirect } from "next/navigation"
import BlogManager from "@/components/manage/BlogManager"
import { requirePlatformSession } from "@/lib/tenant-auth"
import { hasPlatformOperation } from "backend/lib/platform-access"

export default async function PlatformBlogAdminPage() {
	const session = await requirePlatformSession()
	if (!(await hasPlatformOperation(session, "PLATFORM_CONTENT"))) redirect("/platform")
	return <BlogManager endpoint="/api/platform/blog" heading="Platform blog" />
}
