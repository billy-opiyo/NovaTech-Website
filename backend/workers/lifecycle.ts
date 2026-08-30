import { runSubscriptionLifecycleSweep } from "../billing/lifecycle"
import { processShopperEnquiryRetention, processVerificationEvidenceRetention, runTenantRetentionSweep } from "../retention/tenant-retention"

async function main() {
	const now = new Date()
	const lifecycle = await runSubscriptionLifecycleSweep(now)
	const retention = await runTenantRetentionSweep(now)
	const enquiryRetention = await processShopperEnquiryRetention(now)
	const evidenceRetention = await processVerificationEvidenceRetention(now)
	console.log(JSON.stringify({ worker: "lifecycle", ranAt: now.toISOString(), lifecycle, retention, enquiryRetention, evidenceRetention }))
}

main().catch((error) => {
	console.error("Lifecycle worker failed", error)
	process.exitCode = 1
})
