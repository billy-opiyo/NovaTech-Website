export type PaymentProvider = "mpesa" | "stripe"

export type PaymentStatus =
	| "PENDING"
	| "PROCESSING"
	| "COMPLETED"
	| "FAILED"
	| "CANCELLED"
	| "REFUNDED"

export interface PaymentResult {
	ok: boolean
	provider: PaymentProvider
	reference: string
	status: PaymentStatus
	message?: string
	metadata?: Record<string, unknown>
}

export interface MpesaInitiateResult extends PaymentResult {
	checkoutRequestId: string
	merchantRequestId?: string
	phone: string
	amount: number
	currency: string
}

export interface MpesaVerifyResult extends PaymentResult {
	checkoutRequestId: string
	resultCode?: number
	resultDescription?: string
	mpesaReceiptNumber?: string
	phone?: string
	amount?: number
}

export interface CardIntentResult extends PaymentResult {
	clientSecret: string
	amount: number
	currency: string
	customerEmail: string
}

export interface CardVerifyResult extends PaymentResult {
	paymentIntentId: string
	amount?: number
	currency?: string
	customerEmail?: string
}

export interface WebhookResult {
	ok: boolean
	received: boolean
	provider: PaymentProvider
	event: string
	receivedAt: string
	message?: string
}

export interface MpesaStkCallbackPayload {
	Body: {
		stkCallback: {
			MerchantRequestID: string
			CheckoutRequestID: string
			ResultCode: number
			ResultDesc: string
			CallbackMetadata?: {
				Item: Array<{
					Name: string
					Value?: string | number
				}>
			}
		}
	}
}

export interface MpesaC2BPayload {
	TransactionType: string
	TransID: string
	TransTime: string
	TransAmount: number
	BusinessShortCode: string
	BillRefNumber: string
	InvoiceNumber?: string
	OrgAccountBalance?: number
	ThirdPartyTransID?: string
	MSISDN: string
	FirstName: string
	MiddleName?: string
	LastName?: string
}