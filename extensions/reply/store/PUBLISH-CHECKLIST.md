# Aurora Reply — publish checklist

## A. Server (before anyone installs from the store)
- [ ] Upload `aurora-reply-backend-update.zip` into `public_html` (adds 1–3 replies, trial/free/packs engine, cost log).
- [ ] In `aurora-config.php` set `'reply_plans' => true` so every Aurora account gets the 3-day trial, then 10 free replies a month. (Leave it false and only access codes work.)
- [ ] Confirm `anthropic_api_key` is set and a monthly spend limit is set in the Anthropic console.
- [ ] Upload the latest `aurora-website-update.zip` (privacy policy with the Aurora Reply section; the /reply page).
- [ ] Test the customer path once with a fresh email: sign up → copy the licence key from My account → paste in Reply → Save & check says "Key accepted" and the dashboard shows the Free trial banner → draft one reply.

## B. Make the reviewer code (see LISTING.md section 4) and keep it safe.

## C. Chrome Web Store (Developer Dashboard → publisher AURORA STUDIOS → Add new item)
1. Upload `1-UPLOAD-THIS/aurora-reply-0.3.2.zip` directly (not the pack folder).
2. **Store listing:** name, summary, description, category Productivity, language English, icon (from the package), screenshots from `2-IMAGES` (5), small tile 440×280, marquee 1400×560, homepage and support URLs.
3. **Privacy:** single purpose, permission justifications, data-usage ticks, privacy policy URL — all in LISTING.md section 3.
4. **Distribution:** Free, Public, regions (LISTING.md 3b).
5. **Test instructions:** paste the text from LISTING.md section 4 with the reviewer code.
6. **Submit for review.** Keep "publish automatically" ticked, or untick it to publish by hand after approval (you then have 30 days).
7. Slots: AURORA STUDIOS shows 1/2, so Reply uses the last free slot. Request an increase before the studios.

## D. After approval
- [ ] Put the store link on the website's Reply page ("Add to Chrome") and in the home banner; update the Reply FAQ answer about pricing.
- [ ] Watch Telegram and email for "Report a problem" messages; keep the cost report (/reply-admin/) open for the first week.
- [ ] Next: billing products for packs and subscription, then flip the website to show prices.
