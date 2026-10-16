# Aurora site (getaurorastudios.com)

Static marketing site + accounts + billing + license server, built to run on an ordinary **HostGator cPanel plan** — no Node server, no Vercel, no Supabase.

| Part | Tech | Where it runs |
|---|---|---|
| Website (home, pricing, studios, account, legal) | Next.js, exported to plain HTML/JS | `public_html/` |
| API (sign-up, login, trial, license check, Stripe/PayPal, downloads) | PHP 8 + MySQL, no dependencies | `public_html/api/` |
| Secrets + release zips | PHP config file, zip files | **outside** `public_html` |

## Pricing logic

3-day free trial (no card, all three extensions) → **launch window** (3 months from `launch_date`): all three for **$10/month**, locked while the subscription stays active → afterwards **$10 per extension** or **$20 for all three**. Prices live in Stripe/PayPal; the API picks the launch price by date (`api/lib/pricing.php`).

## Deploy on HostGator (cPanel)

1. **Database** — cPanel → *MySQL Databases*: create a database and a user, give the user *All privileges*. Open *phpMyAdmin*, select the database, *Import* → `hostgator/schema.sql`.
2. **Email** — cPanel → *Email Accounts*: create `no-reply@getaurorastudios.com` (used for confirmation and reset emails).
3. **License keys** — run `php hostgator/gen-license-key.php` (or `node scripts/gen-license-key.mjs`). Keep the private key line; keep `PUBLIC_KEY_JWK` for the extensions.
4. **Config** — in *File Manager*, open your home folder (the one that *contains* `public_html`). Copy `hostgator/aurora-config.sample.php` there as **`aurora-config.php`** and fill it in (database, license key, Stripe, PayPal). Create a folder **`aurora-releases`** next to it.
5. **Upload the site** — on your computer: `npm install`, then `npm run build:hostgator`. Upload `dist/aurora-public_html.zip` to `public_html` and *Extract* (it includes `.htaccess` and `api/`).
6. **Check** — open `https://getaurorastudios.com/api/me`. You should see `{"ok":false,"error":"Please sign in."}`. Then sign up on the site; the confirmation email arrives; the link signs you in.
7. **Stripe** — create 5 monthly Prices (all-3 launch $10, all-3 $20, and $10 for each extension) and put their IDs in the config. Webhook endpoint: `https://getaurorastudios.com/api/webhooks/stripe`, events `checkout.session.completed` and `customer.subscription.created|updated|deleted`. Turn on the customer portal.
8. **PayPal** — create a Product and 5 monthly Billing Plans, put the IDs in the config. Webhook: `https://getaurorastudios.com/api/webhooks/paypal` with `BILLING.SUBSCRIPTION.*` and `PAYMENT.SALE.COMPLETED`. Keep `paypal_env` = `sandbox` until you have tested, then `live`.
9. **Extensions** — in each extension repo: `node scripts/configure-license.cjs --api https://getaurorastudios.com --jwk '<PUBLIC_KEY_JWK>'`, then `npm run package`. Upload the zips to `aurora-releases/` named `aurora-facebook-latest.zip`, `aurora-instagram-latest.zip`, `aurora-tiktok-latest.zip`. Customers download them from their account page.

## Develop & test

```bash
npm install
npm test               # pricing unit tests (vitest)
npm run test:php       # PHP API tests: 50 checks on a temporary SQLite database
npm run build:e2e && npm run test:e2e   # real-browser flow: sign up → email link → account → download → login/reset → license check
npm run build:preview  # demo copy for GitHub Pages (demo account, checkout off)
```

`hostgator/tests/cross.test.cjs` proves a token minted by the PHP server is accepted by the real `license.js` in the three extensions.

## Security notes

* Secrets (`aurora-config.php`, private license key, Stripe/PayPal keys) and the release zips live outside `public_html`.
* Passwords are hashed with PHP's `password_hash`; sessions are random tokens stored hashed; email links are one-time and hashed; login, sign-up, forgot-password and license checks are rate limited; webhooks verify signatures and PayPal state is re-read from PayPal.
* A client-side license check can be bypassed by someone who edits an unpacked extension. Signed 72-hour tokens, the 3-browser limit and server-side downloads make casual sharing hard, not impossible.
* The legal pages are templates: have them reviewed. Automating Facebook/Instagram/TikTok activity violates those platforms' terms; the site says so openly.
