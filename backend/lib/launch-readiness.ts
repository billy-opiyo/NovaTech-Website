import prisma from "./db"
import { getCurrentMerchantLegalAcceptance } from "./legal-acceptance"

export type ReadinessStatus = "PASS" | "PENDING" | "FAIL"
export type ReadinessCheck = { key: string; label: string; status: ReadinessStatus; detail: string; source: string }

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function hasContact(value: unknown) {
	if (!isRecord(value)) return false
	return ["email", "phone", "whatsapp", "whatsappNumber"].some((key) => typeof value[key] === "string" && value[key].trim().length > 0)
}

export async function getLaunchReadiness(tenantId: string, storeId: string, options: { legalAcceptanceOverride?: boolean } = {}) {
	const [tenant, store, domains, legalAcceptance] = await Promise.all([
		prisma.tenant.findFirst({ where: { id: tenantId }, select: { status: true, verificationStatus: true } }),
		prisma.store.findFirst({ where: { id: storeId, tenantId }, select: { publicationStatus: true, name: true, slug: true, contactSettings: true, draftSettings: true } }),
		prisma.domain.findMany({ where: { tenantId, storeId }, select: { hostname: true, type: true, verificationStatus: true, sslStatus: true, isCanonical: true } }),
		getCurrentMerchantLegalAcceptance(tenantId, "SELLING"),
	])

	const draft = isRecord(store?.draftSettings) ? store.draftSettings : null
	const currentContact = store?.contactSettings
	const contact = hasContact(draft?.contact) || hasContact(currentContact)
	const canonicalCustomDomain = domains.find((domain) => domain.type === "CUSTOM" && domain.isCanonical)
	const customDomainReady = !canonicalCustomDomain || (canonicalCustomDomain.verificationStatus === "VERIFIED" && Boolean(canonicalCustomDomain.sslStatus && ["ACTIVE", "ISSUED", "READY"].includes(canonicalCustomDomain.sslStatus.toUpperCase())))
	const statusReady = Boolean(tenant && ["TRIALING", "ACTIVE", "GRACE_PERIOD"].includes(tenant.status))
	const verificationReady = tenant?.verificationStatus === "APPROVED"
	const legalReady = Boolean(legalAcceptance || options.legalAcceptanceOverride)
	const settingsReady = Boolean(store && (store.publicationStatus === "PUBLISHED" || draft))

	const checks: ReadinessCheck[] = [
		{ key: "tenant-status", label: "Tenant account available", status: statusReady ? "PASS" : "FAIL", detail: tenant ? `Tenant status is ${tenant.status}.` : "Tenant was not found.", source: "Tenant.status" },
		{ key: "merchant-verification", label: "Merchant approval", status: verificationReady ? "PASS" : "PENDING", detail: tenant ? `Merchant verification is ${tenant.verificationStatus}.` : "Merchant verification is unavailable.", source: "Tenant.verificationStatus" },
		{ key: "legal-acceptance", label: "Current merchant terms accepted", status: legalReady ? "PASS" : "PENDING", detail: legalReady ? "Current selling terms are accepted." : "A current selling acceptance is required before publication.", source: "MerchantLegalAcceptance" },
		{ key: "contact-details", label: "Public contact details", status: contact ? "PASS" : "PENDING", detail: contact ? "At least one public contact method is configured." : "Add an email, phone, or WhatsApp contact method to store settings.", source: "Store.contactSettings / draftSettings" },
		{ key: "store-settings", label: "Store settings saved", status: settingsReady ? "PASS" : "PENDING", detail: settingsReady ? "Store settings or a publishable draft are available." : "Save store settings before publishing.", source: "Store.draftSettings / publicationStatus" },
		{ key: "platform-host", label: "Platform storefront host", status: store ? "PASS" : "FAIL", detail: store ? `The ${store.slug} platform host is available for this store.` : "Store host cannot be resolved.", source: "Store.slug" },
		{ key: "custom-domain", label: "Canonical custom domain", status: customDomainReady ? "PASS" : "FAIL", detail: canonicalCustomDomain ? `${canonicalCustomDomain.hostname} must be verified and have an active SSL status.` : "No canonical custom domain is configured; the platform host remains available.", source: "Domain.verificationStatus / sslStatus" },
	]

	return { ready: checks.every((check) => check.status === "PASS"), checkedAt: new Date().toISOString(), tenantId, storeId, publicationStatus: store?.publicationStatus || null, checks, domains }
}
