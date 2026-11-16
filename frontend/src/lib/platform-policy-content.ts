import type { InfoSection } from "@/components/content/InfoPage"

export const LEGACY_PLATFORM_POLICY_DEFAULTS = {
	terms: "Nurava HubStores provides the platform that helps independent merchants publish storefronts and connect with shoppers. Each merchant remains responsible for its products, prices, availability, delivery, payment terms, refunds, warranties, taxes, and customer support.",
	privacy: "Nurava HubStores processes platform account and operational information to provide hosting, authentication, support, and merchant tools. Merchants are responsible for the shopper information they collect and how they use it in their own store.",
	cookies: "Nurava HubStores uses necessary cookies and local storage for authentication, security, preferences, cart continuity, and platform performance. Optional analytics or marketing technologies should only be enabled where properly disclosed and permitted.",
} as const

export const DEFAULT_PLATFORM_TERMS = `1. About these terms
These terms govern a merchant’s access to and use of the Nurava HubStores platform, including platform administration, store discovery, hosting, storefront software, merchant tools, support, and related subscription services. They apply to the relationship between Nurava HubStores and the merchant account holder. A merchant’s own terms for shoppers are separate and are published and controlled by that merchant.

2. The platform and independent stores
Nurava HubStores supplies technology that helps independent businesses operate online stores. Each merchant is an independent seller and is responsible for its business, products, product descriptions and images, prices, stock, promotions, order acceptance, customer communications, delivery, payment collection, refunds, replacements, warranties, taxes, permits, and compliance with consumer and other applicable laws. Nurava HubStores is not the seller or merchant of record for goods offered by independent merchants and does not receive or hold shopper payments for those goods. Shoppers should contact the relevant merchant about a product or order.

3. Merchant accounts and acceptable use
The person creating an account must have authority to bind the business. Merchants must provide accurate and current account and business information, protect credentials, limit access to authorized people, and promptly report suspected account compromise. The platform may be used only for lawful business activity. Merchants must not upload unlawful, deceptive, infringing, malicious, or unsafe material; interfere with platform security or availability; misuse shopper information; or misrepresent their relationship with Nurava HubStores.

4. Platform services, plans, and configuration
Available features, included limits, optional paid add-ons, setup requirements, and service availability depend on the selected plan and the platform configuration shown in the merchant workspace or onboarding flow. Nurava HubStores may update or improve its software and may use hosting, communications, payment, identity, storage, and other service providers to operate it. Optional third-party products may have their own terms and availability.

5. Setup fee, pilot, subscriptions, and payment
The one-time setup fee, selected plan price, billing interval, and applicable configured free pilot duration are disclosed during onboarding or in the merchant workspace before payment. The merchant pays the setup fee before platform setup begins. The selected plan applies during the configured pilot; recurring subscription charges begin when that pilot ends, unless the merchant cancels or the account is otherwise ended before renewal. Subscriptions are billed monthly in Kenyan Shillings (KES) unless the account states otherwise. A pilot is an access period and does not waive the setup fee or change the plan selected for the account.

Platform subscription payments are made through the available M-Pesa PayBill or Till collection flow. A merchant-initiated M-Pesa prompt must be reviewed and approved by the payer using their PIN. If manual phone transfer is enabled for an account, the merchant sends the payment and submits its receipt for verification. Payment is applied after the platform confirms it. The platform does not initiate automatic recurring M-Pesa debits. A 14-day grace period applies to a due subscription payment. If an amount remains unpaid after the applicable grace period, platform features or access may be restricted until the account is brought current.

6. Taxes, invoices, and account records
The platform displays the applicable price and tax treatment for the merchant account. Where VAT is applicable and enabled for the registered business, the invoice identifies the applicable rate and shows the relevant net amount, tax, credits, and balance. Tax treatment depends on the service, the merchant’s registration details, and applicable law. Merchants remain responsible for taxes and records relating to their own product sales. Merchants should keep payment receipts and promptly raise a billing query if an invoice or payment allocation appears incorrect.

7. Cancellation, refunds, and service credits
A merchant may request cancellation through the available account or support process. Unless the account states otherwise or law requires it, voluntary cancellation does not create a routine refund of subscription amounts already paid; paid access continues through the end of the covered period. Refunds may be made for a duplicate payment, a confirmed billing error, or where required by law. The setup fee is refundable if Nurava HubStores cannot provision the store before setup work begins; once setup work has started, the setup fee is non-refundable, except where applicable law requires otherwise.

For a verified Nurava HubStores platform or core-hosting outage lasting at least 24 continuous hours, an active paid plan receives a future subscription account credit equal to one day of recurring monthly subscription value for each complete 24-hour outage period, capped at one monthly subscription fee. Credits do not apply to setup fees and are not cash refunds. Scheduled maintenance, merchant-side internet, device, configuration, or account issues, force majeure events, and failures of optional third-party services are excluded. This credit process does not limit rights that cannot legally be excluded.

8. Shopper orders, refunds, and warranties
The merchant sets and communicates its own shopper payment, delivery, cancellation, return, refund, replacement, and warranty terms, subject to applicable law. The merchant handles product quality, accurate descriptions, fulfilment, customer complaints, and any remedy owed to a shopper. A platform subscription payment is separate from a shopper’s payment for goods. Nothing in these platform terms makes Nurava HubStores responsible for a merchant’s products or removes a shopper’s mandatory legal rights against the seller.

9. Content, brands, and platform intellectual property
The merchant retains ownership of its business name, logos, product information, photographs, and other materials it supplies. The merchant grants Nurava HubStores a limited, non-exclusive permission to host, reproduce, secure, back up, and display those materials as needed to provide and promote the merchant’s configured store and platform services. The merchant confirms it has the rights and permissions needed to provide that material. Nurava HubStores and its licensors retain their rights in the platform software, infrastructure, platform marks, and platform-provided designs and materials. No ownership transfers except for the limited permissions stated here.

10. Privacy and security
Each party must handle personal information in accordance with applicable data protection law and the platform Privacy Policy. Nurava HubStores handles merchant account and platform operations information to provide the service. Where the platform processes shopper information on a merchant’s behalf, the merchant determines the purposes and must provide its own required shopper notices, collect information lawfully, and use it only for permitted purposes. The merchant must protect its account and promptly report suspected unauthorized access or disclosure.

11. Availability and responsibility
Nurava HubStores works to provide a reliable service but does not promise uninterrupted or error-free availability. Service may be affected by maintenance, internet or telecommunications providers, hosting and other third parties, security events, or circumstances outside reasonable control. To the extent permitted by law, Nurava HubStores is responsible for providing the contracted platform service and is not responsible for a merchant’s independent business decisions, product sales, fulfilment, or customer obligations. Nothing in these terms excludes liability or consumer and data-protection rights that cannot lawfully be excluded or limited.

12. Suspension, closure, and data
Nurava HubStores may limit or suspend access where reasonably necessary to address overdue payment, security risk, suspected unlawful activity, material misuse, or a legal requirement. Where practicable, the platform will explain the reason and steps to restore access. Suspension does not cancel the merchant’s outstanding customer obligations. After paid access ends, merchant workspace data is retained for 90 days and then deleted or anonymized, subject to backups, legal holds, and applicable law. Closed shopper enquiries and contact details are retained for 12 months after the last interaction while the workspace remains active. Sensitive verification files are deleted 90 days after the final decision or account end, whichever is later. Billing, invoice, payment, refund or credit, audit, and legal-acceptance records are retained for 7 years unless a legal hold or applicable law requires longer.

13. Changes, acceptance, and governing law
The platform records the version of these terms accepted by a merchant. Material changes are notified at least 30 days before they apply to an existing subscription and take effect at renewal. A change required sooner for security, legal compliance, or prevention of harm may take effect earlier, with notice where practicable. Minor corrections that do not materially change meaning do not by themselves require new acceptance. Continued use after an applicable renewal means the merchant accepts the updated terms; the merchant may cancel before that renewal. These terms are governed by the laws of Kenya, subject to mandatory rights and rules that apply to the merchant. Contact Nurava HubStores through the platform contact page for account, billing, privacy, or service questions.`

export const DEFAULT_PLATFORM_PRIVACY = `1. Scope and responsibilities
This Privacy Policy explains how Nurava HubStores handles information when people use the platform website and when merchants create or operate a platform account. It covers platform account and service operations. Each independent merchant controls its own storefront customer relationship and must provide its own privacy notice and lawful handling instructions for shopper information collected through that store. A merchant’s policy is not replaced by this platform policy.

2. Information we handle
Depending on how the service is used, information may include merchant contact and login details; business and verification information; store name, domain, configuration, catalogue and uploaded content; plan, setup, subscription, invoice, payment-status and support records; security, access, diagnostic and audit logs; and messages sent to the platform. When a shopper browses or contacts a platform-operated store, technical, preference, cart, comparison, checkout, enquiry, or order-related information may also be processed to provide those features. Payment credentials and M-Pesa PINs are entered only into the relevant payment provider’s approved flow and are not requested by Nurava HubStores.

3. How information is used
Nurava HubStores uses information to create and administer accounts; configure, host, secure, and support stores; provide platform discovery and requested features; process setup and subscription billing; respond to requests; prevent fraud, abuse, and security incidents; maintain backups and service records; comply with legal obligations; and improve reliability. Marketing messages are sent only where permitted, and recipients can use the available unsubscribe or preference controls.

4. Legal grounds
Where data protection law requires a legal ground, processing is based on the steps needed to provide a requested service or perform a contract, compliance with a legal obligation, legitimate interests such as securing and improving the platform where those interests are not overridden by individual rights, or consent where consent is required. Consent can be withdrawn for future processing that relies on it; withdrawal does not affect processing already carried out lawfully.

5. Platform and merchant roles
Nurava HubStores acts as a controller for information used to manage its own merchant accounts, platform security, billing, support, and legal records. For shopper personal information a merchant places in the platform to run its store, the merchant determines why and how that information is used; Nurava HubStores processes it on the merchant’s documented instructions to host and operate the service, subject to applicable law and the parties’ arrangements. The merchant is responsible for its shopper notices, lawful collection, permissions, accuracy, and responses to shopper requests that concern the merchant’s use.

6. Sharing and service providers
Information may be shared with authorized hosting, database, storage, authentication, communications, payment-verification, security, analytics, and support providers where needed to deliver or protect the service. Those providers may process information in Kenya or another country, subject to appropriate contractual, security, and transfer safeguards required by law. Information may also be disclosed to a person with the account holder’s authority, a regulator, court, law-enforcement body, or other recipient where necessary to comply with law, protect people, investigate abuse, or establish or defend legal claims. Nurava HubStores does not sell personal information.

7. Security and incidents
Nurava HubStores uses reasonable technical and organizational safeguards designed to protect information from unauthorized access, loss, alteration, or disclosure. No online system can be guaranteed completely secure. Access is limited to people and providers who need it for their duties. If a personal data breach occurs, Nurava HubStores will assess and notify affected parties or authorities when and as required by applicable law. Merchants must protect their credentials and promptly notify the platform of suspected compromise involving their account or store.

8. Retention
Information is retained only as long as reasonably needed for the purposes described here, subject to operational backups and legal obligations. After paid merchant access ends, workspace data is retained for 90 days and then deleted or anonymized. Closed shopper enquiries and contact details are retained for 12 months after the last interaction while the workspace remains active. Sensitive verification files are deleted 90 days after the final decision or account end, whichever is later. Billing, invoice, payment, refund or credit, audit, and legal-acceptance records are retained for 7 years unless a legal hold or applicable law requires longer. Some security logs or backups may persist for a limited period while systems rotate or recover them.

9. Individual rights and choices
Subject to applicable law and its conditions, a person may ask to be informed about use of their information, access it, object to certain processing, request correction or deletion, request restriction or portability where applicable, or withdraw consent. A shopper should contact the merchant that collected their information for requests about that merchant’s store and use. A merchant account holder may contact Nurava HubStores through the platform contact page for requests about platform-held account information. Identity may need to be verified before a request is completed. A person may also raise a concern with the Office of the Data Protection Commissioner in Kenya.

10. Children and changes
The platform is designed for business operators and is not directed to children. Merchants must not knowingly collect or use children’s personal information through a store unless they have a lawful basis, any required parent or guardian authorization, and appropriate safeguards. Nurava HubStores may update this policy when services or legal requirements change. Material changes will be posted on the platform and, where appropriate, notified to account holders. The current version applies from its stated publication or effective date. Contact Nurava HubStores through the platform contact page with privacy questions.`

export const DEFAULT_PLATFORM_COOKIES = `1. Scope and what browser storage does
This policy covers cookies and similar browser technologies used by the Nurava HubStores platform website and platform-operated store features. Cookies are small values stored by a browser; local storage and session storage are browser-managed data areas. These technologies can keep a session secure, remember a choice, preserve a shopping action, or support a feature between page visits. Merchant-operated storefronts may have additional settings and disclosures controlled by their merchant owner.

2. Essential security and session cookies
Authentication and security cookies help recognize a signed-in session, protect requests, and prevent unauthorized use. A platform store-preference cookie can remember a selected store so the website can route a later visit consistently. These cookies are used to provide requested features and protect the service. Blocking them may prevent sign-in, account administration, secure navigation, or store selection from working correctly. Their lifetimes depend on the session and security configuration; the store preference may be retained for up to 180 days.

3. Local and session storage
Depending on the feature used, browser storage may remember a theme or display choice, shopping cart and saved items, a coupon entered for checkout, product comparisons, an in-progress checkout attempt, a mobile sign-in handoff, or dismissal of an app-install prompt. Session values generally clear when the browsing session ends; local values can remain until they expire or are cleared by the user or browser. These values support the feature the visitor chose to use. They are not a place for a payment card number, M-Pesa PIN, or other payment credential.

4. Optional measurement and marketing
Optional analytics, personalization, or advertising technologies are used only if the platform enables them and provides any notice and choice required by law. They are not necessary to sign in, browse the platform, or operate essential store functions. If optional technologies are introduced, this policy and any available preference controls will identify them and explain how to change the choice. Third-party services may set their own technologies under their respective policies.

5. Managing browser choices
Most browsers let visitors review, block, or delete cookies and clear site storage. Visitors can use browser settings or privacy controls to manage these choices. Clearing or blocking essential storage may sign the visitor out, remove a saved cart or preference, interrupt checkout continuity, or prevent platform features from working. Where an optional consent control is provided, a visitor can change that choice through the control or by clearing its saved preference.

6. Updates and contact
The platform may revise this policy when browser technologies or services change. The current text is available on the platform Cookie Policy page. For questions about platform browser storage, contact Nurava HubStores through the platform contact page. For storage used by an independent merchant’s own storefront, contact that merchant and review its store policy.`

export function platformPolicySections(content: string, fallbackTitle: string): InfoSection[] {
	const blocks = content.split(/\r?\n\s*\r?\n/).map((block) => block.trim()).filter(Boolean)
	if (!blocks.length) return [{ title: fallbackTitle, content: "" }]
	return blocks.map((block, index) => {
		const newline = block.indexOf("\n")
		if (newline < 0) return { title: index === 0 ? fallbackTitle : `Policy details ${index + 1}`, content: block }
		return { title: block.slice(0, newline).trim(), content: block.slice(newline + 1).trim() }
	})
}
