import { Prisma } from "@prisma/client"
import prisma from "./db"

export const CURRENT_MERCHANT_LEGAL_DOCUMENTS = {
	termsVersion: "merchant-terms-v1",
	privacyVersion: "merchant-privacy-v1",
	agreementVersion: "merchant-agreement-v1",
} as const

export type MerchantLegalAcceptanceContext = "TRIAL_START" | "SELLING"

export function isCurrentMerchantLegalAcceptance(input: {
	termsVersion: string
	privacyVersion: string
	agreementVersion: string
} | null | undefined) {
	return Boolean(
		input &&
		input.termsVersion === CURRENT_MERCHANT_LEGAL_DOCUMENTS.termsVersion &&
		input.privacyVersion === CURRENT_MERCHANT_LEGAL_DOCUMENTS.privacyVersion &&
		input.agreementVersion === CURRENT_MERCHANT_LEGAL_DOCUMENTS.agreementVersion,
	)
}

export async function getCurrentMerchantLegalAcceptance(tenantId: string, context: MerchantLegalAcceptanceContext) {
	const acceptance = await prisma.merchantLegalAcceptance.findFirst({
		where: { tenantId, context },
		orderBy: { acceptedAt: "desc" },
		select: { id: true, acceptedById: true, acceptedAt: true, termsVersion: true, privacyVersion: true, agreementVersion: true },
	})
	return isCurrentMerchantLegalAcceptance(acceptance) ? acceptance : null
}

export async function recordMerchantLegalAcceptance(input: {
	tenantId: string
	acceptedById: string
	context: MerchantLegalAcceptanceContext
	transaction?: Prisma.TransactionClient
}) {
	const client = input.transaction || prisma
	return client.merchantLegalAcceptance.create({
		data: {
			tenantId: input.tenantId,
			acceptedById: input.acceptedById,
			context: input.context,
			termsVersion: CURRENT_MERCHANT_LEGAL_DOCUMENTS.termsVersion,
			privacyVersion: CURRENT_MERCHANT_LEGAL_DOCUMENTS.privacyVersion,
			agreementVersion: CURRENT_MERCHANT_LEGAL_DOCUMENTS.agreementVersion,
		},
		select: { id: true, context: true, acceptedAt: true, termsVersion: true, privacyVersion: true, agreementVersion: true },
	})
}
