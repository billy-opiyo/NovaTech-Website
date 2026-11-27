import { revalidateTag, unstable_cache } from "next/cache"
import { getMvpPilotDays } from "backend/billing/mvp-policy"

const PILOT_POLICY_TAG = "public-platform-pilot-policy"

export const getCachedMvpPilotDays = unstable_cache(getMvpPilotDays, ["public-platform-pilot-policy-v1"], { revalidate: 60, tags: [PILOT_POLICY_TAG] })

export function revalidatePublicPilotPolicy() {
	revalidateTag(PILOT_POLICY_TAG)
}
