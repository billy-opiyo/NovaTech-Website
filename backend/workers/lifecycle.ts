import { runSubscriptionLifecycleSweep } from "../billing/lifecycle"
import { runTenantRetentionSweep } from "../retention/tenant-retention"

async function main() {
	const now = new Date()
	const lifecycle = await runSubscriptionLifecycleSweep(now)
	const retention = await runTenantRetentionSweep(now)
	console.log(JSON.stringify({ worker: "lifecycle", ranAt: now.toISOString(), lifecycle, retention }))
}

main().catch((error) => {
	console.error("Lifecycle worker failed", error)
	process.exitCode = 1
})
