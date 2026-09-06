/**
 * Explicit staging-only shopper payment fixture for the Nurava Tech demo store.
 *
 * This is deliberately fail-closed: the flag, tenant slug, deployment tier,
 * and sandbox provider environment must all match. The staging deployment is
 * hosted in Vercel's Production environment, so the explicit tier marker is
 * the source of truth instead of VERCEL_ENV alone.
 */
export function isNuravaShopperPaymentTestMode(storeSlug: string | null | undefined) {
	const isLocalDevelopment = !process.env.VERCEL_ENV && process.env.NODE_ENV !== "production"
	const isExplicitStagingDeployment = process.env.NURAVA_DEPLOYMENT_TIER === "staging"
	return process.env.SHOPPER_PAYMENTS_TEST_MODE === "true"
		&& process.env.SHOPPER_PAYMENTS_TEST_TENANT_SLUG === "nuravatech"
		&& storeSlug?.trim().toLowerCase() === "nuravatech"
		&& (isLocalDevelopment || isExplicitStagingDeployment)
		&& process.env.MPESA_ENV !== "production"
}

export function getNuravaShopperPaymentTestConfig(storeSlug: string | null | undefined) {
	if (!isNuravaShopperPaymentTestMode(storeSlug)) return null

	const consumerKey = process.env.MPESA_CONSUMER_KEY?.trim()
	const consumerSecret = process.env.MPESA_CONSUMER_SECRET?.trim()
	const passkey = process.env.MPESA_PASSKEY?.trim()
	const shortcode = process.env.MPESA_SHORTCODE?.replace(/\D/g, "")
	if (!consumerKey || !consumerSecret || !passkey || !shortcode || !/^\d{5,10}$/.test(shortcode)) return null

	return { consumerKey, consumerSecret, passkey, shortcode, accountType: "PAYBILL" as const }
}
