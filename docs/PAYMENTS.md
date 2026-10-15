# Payments, licensing, and release configuration

## Required application configuration

Set values securely in the deployment environment. Never commit credentials or paste them into chat. The application reads these names; no credential values were supplied during development.

| Name | Purpose |
| --- | --- |
| `PUBLIC_URL` | Exact HTTPS origin, without a path or trailing slash; used for redirect URLs, same-origin write protection, and extension packaging |
| `STRIPE_SECRET_KEY` | Server-side Stripe API authentication; start with a test-mode key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for this application's Stripe webhook endpoint |
| `PAYPAL_CLIENT_ID` | PayPal REST application client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal REST application secret |
| `PAYPAL_WEBHOOK_ID` | The webhook registration ID for this app/environment |
| `PAYPAL_PLAN_ID` | Approved plan with the exact three phases below |
| `PAYPAL_ENV` | `sandbox` (default), or `live` only after validation |
| `AURORA_DB` | Optional absolute SQLite path; default `.data/aurora.db` |

Production needs persistent disk and database backups. Deploy one application instance with SQLite and coordinate backups; use an appropriate shared database before horizontally scaling. Keep both the server and packages on the same `PUBLIC_URL`. Restrict reverse-proxy trust to your actual proxy addresses; never trust arbitrary forwarded client IPs. The included rate limiting uses the observed client IP and persisted counters.

For cloud outbound settings, allow `api.stripe.com` and `api-m.sandbox.paypal.com` for testing, and `api-m.paypal.com` for production. Hosted payment approval pages use `checkout.stripe.com`, `www.sandbox.paypal.com`, and `www.paypal.com` in the customer's browser.

Cloud proxy secrets can be placeholders, not raw secrets: do not base64-encode a placeholder and expect it to behave as a PayPal client secret. PayPal Basic OAuth requires application-readable credentials through the deployment's secure runtime-secret mechanism, or a supported managed OAuth integration. Do not extract proxy-held credentials. The repository does not provision merchant accounts or store secrets.

## Stripe

Checkout creates one $10 monthly subscription with a three-day trial and always collects a payment method. The introductory and increased price are disclosed in Aurora consent and Checkout custom text. Server-side reconciliation creates a subscription schedule with:

1. Current free trial through its provider-reported end.
2. Three calendar months at $10/month.
3. $30/month thereafter; the schedule releases to the $30 recurring subscription after its first regular month.

The server creates the $30 recurring price for the same product and attaches the schedule using idempotency keys. No trial license is granted until schedule initialization succeeds. Checkout session creation is idempotent per account/product to prevent duplicate approved subscriptions. One trial per account is enforced. Expired or abandoned sessions currently require support rather than silently creating a replacement trial.

Register `POST /api/webhooks/stripe`. Subscribe at least to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`. Verify signatures with the endpoint-specific signing secret. The backend retrieves canonical provider state; event payloads and browser redirects alone cannot grant access. Failed reconciliation returns an error so the provider retries. Duplicate processed events are ignored.

Stripe API compatibility, subscription-schedule phase semantics, and trial-end behavior must be validated in test mode before public release. No Stripe API version is pinned in this initial implementation; pin the merchant's tested API version before shipping to avoid behavior changing with account defaults.

## PayPal

Create an active subscription plan in the matching PayPal sandbox/live REST application. It must have these exact cycles; no setup fee or added plan tax:

```json
{
  "billing_cycles": [
    {"tenure_type":"TRIAL","sequence":1,"total_cycles":1,
     "frequency":{"interval_unit":"DAY","interval_count":3},
     "pricing_scheme":{"fixed_price":{"value":"0","currency_code":"USD"}}},
    {"tenure_type":"TRIAL","sequence":2,"total_cycles":3,
     "frequency":{"interval_unit":"MONTH","interval_count":1},
     "pricing_scheme":{"fixed_price":{"value":"10","currency_code":"USD"}}},
    {"tenure_type":"REGULAR","sequence":3,"total_cycles":0,
     "frequency":{"interval_unit":"MONTH","interval_count":1},
     "pricing_scheme":{"fixed_price":{"value":"30","currency_code":"USD"}}}
  ]
}
```

PayPal calls the paid introductory phase a second `TRIAL` tenure; it is not free. Set the plan to automatically collect outstanding amounts and configure payment-failure handling appropriate to your business. The app independently denies access when an outstanding balance is reported. Checkout reads and validates the plan before creating a subscription; it does not create or edit plans automatically.

Register `POST /api/webhooks/paypal` for subscription activation/update/cancellation/suspension/expiry and sale completion/payment-failure/refund events. The app verifies events using PayPal's verification endpoint and then retrieves the canonical subscription. Customer approval is required. PayPal cancellation ends access immediately; period-end cancellation is not represented as supported.

## Required merchant sandbox exercise

With a publicly reachable HTTPS test deployment and credentials, verify both providers independently:

1. A new customer sees and approves the full recurring price schedule, including the $30 increase.
2. Abandoning or rejecting checkout grants no trial, license, or download.
3. Approved checkout starts the provider trial and unlocks all three downloads. Stripe's exact trial and scheduled phase timestamps must match expectations, including end-of-month dates.
4. Generate a license, activate each installed extension, replace the license, and verify the old key is rejected after the maximum one-minute validation cache.
5. Advance time using supported merchant test facilities (or staged test subscriptions), verify three $10 charges and then the first $30 renewal. Never shorten the production plan simply to make a test pass.
6. Failed renewals, suspended/canceled subscriptions, duplicate and out-of-order webhooks, transient provider failures, and expired trials must not grant unpaid access.
7. Cancel during trial and during a paid month, verify no later charges, provider-specific access timing, and repeat cancellation safely.
8. Test refunds and disputes operationally; automatic refund/dispute revocation is not included. Verify merchant support can cancel subscriptions and revoke access.

No live or sandbox merchant transaction has been executed in this workspace. Local provider-response mocks test the application logic and request shapes; they are not a substitute for this exercise.

## Packages

Export the real `PUBLIC_URL`, then run:

```bash
.venv/bin/python scripts/prepare_extensions.py
```

This copies extension sources into ignored `artifacts/build/`, generates endpoint configuration and host permissions in those build copies, and writes the three ZIPs under `artifacts/`. Source manifests are unchanged. Those ZIPs are private downloads available only after subscription validation. No secrets are embedded. Current local packages point to the local development origin and must be regenerated before distribution. Users extract each ZIP and load its folder through Chrome Developer mode; Chrome Web Store distribution is not configured.

The account portal generates a random license key and stores only its SHA-256 hash. Replacing it revokes the prior key. The extension stores its own plaintext key locally and validates over HTTPS; never log validation bodies. No license key is placed in a URL. Subscription checks validate expected amount, currency, recurrence, order identity, and paid/trial status from the provider. Server expiry and a maximum one-minute active check interval prevent offline time-based trial resets.
