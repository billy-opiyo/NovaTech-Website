import { NextRequest, NextResponse } from "next/server"
import { runSubscriptionLifecycleSweep } from "backend/billing/lifecycle"
import { runPilotReminderSweep } from "backend/billing/reminders"
import { runTenantRetentionSweep } from "backend/retention/tenant-retention"
import { acquireScheduledJobLock, releaseScheduledJobLock } from "backend/workers/job-lock"

export const dynamic = "force-dynamic"

function isAuthorized(request: NextRequest) {
	const secret = process.env.CRON_SECRET
	if (!secret) return false
	return request.headers.get("authorization") === `Bearer ${secret}`
}

export async function GET(request: NextRequest) {
	if (!process.env.CRON_SECRET) return NextResponse.json({ message: "Cron secret is not configured" }, { status: 503 })
	if (!isAuthorized(request)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

	let owner: string | null = null
	try {
		owner = await acquireScheduledJobLock("lifecycle")
		if (!owner) return NextResponse.json({ ok: true, skipped: true, reason: "LIFECYCLE_ALREADY_RUNNING" })

		const startedAt = new Date()
		const lifecycle = await runSubscriptionLifecycleSweep(startedAt)
		const reminders = await runPilotReminderSweep(startedAt)
		const retention = await runTenantRetentionSweep(startedAt)
		return NextResponse.json({ ok: true, worker: "lifecycle", ranAt: startedAt.toISOString(), lifecycle, reminders, retention })
	} catch (error: unknown) {
		console.error("Vercel lifecycle cron failed", error)
		return NextResponse.json({ ok: false, worker: "lifecycle", message: "Lifecycle processing failed" }, { status: 500 })
	} finally {
		if (owner) await releaseScheduledJobLock("lifecycle", owner).catch((error) => console.error("Failed to release lifecycle cron lock", error))
	}
}
