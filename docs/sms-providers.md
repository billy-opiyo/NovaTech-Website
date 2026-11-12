# SMS provider setup

The server-side SMS layer defaults to Africa's Talking's official REST API. Twilio remains installed and supported, but it is used only when `SMS_PROVIDER=twilio` is explicitly configured. A provider failure is returned as an application error; the application never retries the message through the other provider.

## Environment variables

Configure these variables in the server environment only. Do not prefix credentials with `NEXT_PUBLIC_` or expose them to browser code.

| Variable | Purpose |
| --- | --- |
| `SMS_PROVIDER` | `africastalking` (default) or `twilio`. Changing this value and restarting/redeploying switches providers. |
| `AFRICASTALKING_USERNAME` | Africa's Talking application username. Use `sandbox` for its sandbox application. |
| `AFRICASTALKING_API_KEY` | API key for the same Africa's Talking application. Keep sandbox and production keys separate. |
| `AFRICASTALKING_SENDER_ID` | Optional sender ID registered to the Africa's Talking account. |
| `SMS_PROVIDER_TIMEOUT_MS` | Optional positive request timeout in milliseconds; defaults to `15000`. |
| `TWILIO_ACCOUNT_SID` | Retained Twilio account SID, required when Twilio is selected. |
| `TWILIO_AUTH_TOKEN` | Retained Twilio auth token, required when Twilio is selected. |
| `TWILIO_PHONE_NUMBER` | Optional default Twilio sender; a per-message sender ID may override it. |

### Local development and preview

Use the Africa's Talking sandbox username and sandbox API key in local development or a Vercel Preview environment. Do not use production credentials for automated tests. Automated SMS tests inject fake HTTP/provider clients and do not make network calls.

### Production and Vercel

In Vercel Project Settings → Environment Variables, add `SMS_PROVIDER=africastalking`, the production `AFRICASTALKING_USERNAME`, and production `AFRICASTALKING_API_KEY`. Add `AFRICASTALKING_SENDER_ID` only if you have a registered sender ID; otherwise leave it unset and use the account's supported sender configuration. Apply sandbox credentials separately to Preview/Development and production credentials only to Production, then redeploy the relevant environment.

To switch back, set `SMS_PROVIDER=twilio`, provide the existing `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` (and `TWILIO_PHONE_NUMBER` if needed), and restart/redeploy. No database migration is required for provider selection.

## Phone numbers and OTP handling

SMS delivery normalizes common Kenyan inputs (`0712345678`, `0112345678`, `254712345678`, `+254712345678`) to E.164. Explicit international numbers are preserved in E.164 form; international numbers supplied as digits only receive the `+` prefix. Invalid values are rejected before contacting a provider.

The provider layer only delivers messages. Merchant phone verification keeps its existing six-digit code, salted one-way hash, 10-minute expiry, five-attempt cap, one-minute resend cooldown, authentication, and rate limits. Database compare-and-update operations ensure concurrent resends cannot bypass the cooldown and concurrent valid submissions cannot consume the same code twice. No OTP, message body, phone number, or provider credential is written to provider-error logs.

## Operational behavior

Missing credentials, invalid provider configuration, provider rejection, insufficient balance, network errors, and timeout are surfaced as a generic safe application error. Server diagnostics include only the configured provider and safe error category/code/status. The system does not fail over between paid SMS providers.
