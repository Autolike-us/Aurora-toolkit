# Aurora Reply — turn on pricing, checkout and keys (do this once, in this order)

What customers will see: they create a free Aurora account → **My account** shows their **Aurora Reply key** → they paste it in the extension → 3-day trial → 10 free replies a month → buy a **pack** (one-off) or a **monthly plan** from the website (/reply/#plans or My account). Prices on the website come from the server, so there is one place to change them.

Default prices (change them later, see the end): packs $5 = 150 replies, $15 = 600 replies; plans $12/month = 1,500 replies, $29/month = 5,000 replies.

## 1. Upload the server files
1. Extract `aurora-reply-backend-update.zip` into `public_html` (File Manager → Extract). It replaces 8 files in `public_html/api/`.
2. Extract the latest `aurora-website-update.zip` into `public_html`.

## 2. Create the Reply plans in PayPal and Stripe (once)
Extract `aurora-payments-tools.zip`, upload these two files to `public_html/api/`, open each once, then delete them (and any `aurora-config.php.bak-…` copies):
1. `https://getaurorastudios.com/api/paypal-setup-ONE-TIME.php?live=1` → creates the PayPal product "Aurora Reply" and two monthly plans and saves their IDs in `aurora-config.php`.
2. `https://getaurorastudios.com/api/stripe-setup-ONE-TIME.php?live=1` → creates the Stripe product and two monthly prices (packs need no setup).
They only create what is missing; your studios plans are not touched.

## 3. Check everything
Upload `payments-check-ONE-TIME.php` to `public_html/api/`, open it, read the lines (it never prints secrets). Anything marked `[FAIL]` — send it to me. Delete it afterwards.
PayPal dashboard → your app's webhook: also tick **"Payment capture completed"** (a backup; checkout already confirms purchases when the customer returns). Stripe's existing webhook already includes `checkout.session.completed`.

## 4. Switch it on
In `aurora-config.php` add (or set to true): `'reply_plans' => true,`
Without it the trial, free plan, packs and plans stay off and only access codes work.

## 5. Test as a customer (use a second email)
1. Sign up on the website, confirm the email, open **My account**: you should see the Aurora Reply card with a key and "Your 3-day free trial starts the first time you use Aurora Reply".
2. Paste the key in the extension (Settings & key → Save & check) and draft a reply. The dashboard shows the Free trial banner.
3. Buy the smallest pack ($5) with PayPal or card yourself to confirm it appears on My account ("150 from your packs"). Refund it in PayPal/Stripe afterwards if you like.

## 6. Changing prices
- **Packs and free allowance:** add to `aurora-config.php`, for example `'reply_catalog' => ['packs' => ['pack150' => ['usd' => 6.00]], 'free' => 15],` — the website and checkout follow immediately.
- **Monthly plans:** PayPal/Stripe plans keep the price they were created with. To change one: put the new price in `reply_catalog` (`'subs' => ['reply' => ['usd' => 14.00]]`), empty that plan's ID in `aurora-config.php` (`paypal_plan_reply` / `stripe_price_reply`), and run the matching setup script again. Existing subscribers keep their old price until they re-subscribe.

## Where to look afterwards
- `https://getaurorastudios.com/reply-admin/` — real cost per reply by month (needs an admin code).
- Telegram and email for problem reports.
