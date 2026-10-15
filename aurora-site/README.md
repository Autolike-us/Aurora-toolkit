# Aurora site

Marketing site, accounts, billing and license server for the Aurora extensions (Facebook, Instagram, TikTok).

* **Next.js 16 (App Router) + TypeScript**, plain CSS, deploys to Vercel.
* **Supabase**: email/password auth + Postgres (`supabase/schema.sql`) + a private `releases` storage bucket.
* **Stripe** (cards) and **PayPal** (subscriptions) with signed webhooks.
* **License API** (`POST /api/license/verify`): the extensions send their key; the site returns an ES256-signed token valid 72 h.

## Pricing logic (`src/lib/pricing.ts`)

| | price |
|---|---|
| 3-day trial (no card), all 3 extensions | free |
| **Launch window** (3 months from `NEXT_PUBLIC_LAUNCH_DATE`): all 3 extensions | **$10/month**, locked while the subscription stays active |
| After the window: one extension | $10/month |
| After the window: all 3 | $20/month |

The launch price is a separate Stripe Price / PayPal Plan. Customers who subscribe in the window stay on it; nobody new can buy it afterwards (the checkout route picks the price by date).

## Setup

1. `npm install`, copy `.env.example` to `.env.local`.
2. **Supabase**: create a project → SQL editor → run `supabase/schema.sql` → copy URL, anon key, service-role key. Auth → URL configuration: add your site URL and `/account` as redirect.
3. **License keys**: `node scripts/gen-license-key.mjs` → put `LICENSE_PRIVATE_KEY_PKCS8` in the environment, keep `PUBLIC_KEY_JWK` for the extensions.
4. **Stripe**: create 5 monthly Prices (bundle launch $10, bundle $20, facebook $10, instagram $10, tiktok $10) → set `STRIPE_PRICE_*`. Webhook endpoint `https://YOUR-SITE/api/webhooks/stripe` with events `checkout.session.completed`, `customer.subscription.created|updated|deleted` → `STRIPE_WEBHOOK_SECRET`. Enable the customer portal.
5. **PayPal**: create a Product and 5 monthly Billing Plans → `PAYPAL_PLAN_*`. Webhook `https://YOUR-SITE/api/webhooks/paypal` with `BILLING.SUBSCRIPTION.*` and `PAYMENT.SALE.COMPLETED` → `PAYPAL_WEBHOOK_ID`. Use `PAYPAL_ENV=sandbox` until tested.
6. `npm run dev` (http://localhost:3000), `npm test`, `npm run build`.

## Releasing the extensions

For each extension repo (`FB-Growth-V1`, `IG-Growth-V1`, `TK-Growth-V1`):

```bash
node scripts/configure-license.cjs --api https://YOUR-SITE --jwk '<PUBLIC_KEY_JWK>'   # turns enforcement on
npm run package                                                                          # refuses to build an unlocked zip
node ../aurora-site/scripts/upload-release.mjs <facebook|instagram|tiktok> dist/<zip>    # private download for customers
```

Upload the same zip to the Chrome Web Store if you publish there (set `NEXT_PUBLIC_CWS_<PRODUCT>` to show the link on /download).

## Security notes

* The service-role key and private license key exist only on the server. The browser only gets the anon key.
* Webhooks verify signatures; Stripe/PayPal state is re-read from the provider, not trusted from the request.
* A client-side license check can be bypassed by someone who edits an unpacked extension; the signed tokens, device limit (3 browsers) and server-side downloads make casual sharing hard, not impossible.
* Legal pages are templates — have them reviewed before launch. Automating Facebook/Instagram/TikTok activity violates those platforms’ terms; the copy says so honestly and you accept that risk.
