# Uncle Toussaint Playbook site

Plain HTML/CSS/JS sales page for the AI Character Playbook, plus a thank-you/download page. No build step. Payments run through the existing Aurora PHP API (Stripe), so it all lives on the same HostGator plan as getaurorastudios.com.

Suggested address: `toussaint.getaurorastudios.com`.

## How a purchase works

1. Visitor clicks **Get the playbook** → `getaurorastudios.com/api/playbook/buy` → redirected to Stripe's payment page. **The server sets the price** ($9 until `playbook_special_ends`, then $29), so it can't be changed in the browser.
2. After paying, Stripe sends them to `thanks.html`, which confirms the payment and shows a **Download** button.
3. The Stripe webhook (and the thank-you page, whichever comes first) records the order **once** and emails the buyer a private link. The link works for 90 days and up to 10 downloads.
4. The PDF lives outside `public_html`, so it can't be found or guessed.

## Go-live checklist (one time)

**A. The website**
1. cPanel → create the subdomain `toussaint.getaurorastudios.com`, turn on its free SSL (AutoSSL).
2. Upload and Extract `toussaint-playbook-site.zip` into that subdomain's folder.

**B. The server (API update)**
3. Upload and Extract `aurora-api-playbook-update.zip` into `public_html` (it only adds/replaces files under `api/`).
4. In your home folder (the one that contains `public_html`), open `aurora-config.php` and add these lines inside the list (see `aurora-config.sample.php`):
   ```php
   'playbook_site_url'     => 'https://toussaint.getaurorastudios.com',
   'playbook_special_ends' => '2026-11-22T23:59:59Z',
   ```
   (`stripe_secret` and `stripe_webhook_secret` must already be filled in. They are if Aurora Reply packs work.)
5. Upload your PDF to `aurora-releases/uncle-toussaint-playbook.pdf` (same folder as the Aurora zips, **not** in public_html).
6. No database step: the orders table creates itself the first time it is needed.

**C. Test it**
7. Open the subdomain, click Buy, pay (use a promo code from Stripe, or pay $9 and refund yourself in Stripe). You should land on the download page, get the email, and the PDF should download.

## Seeing visits, clicks and sales (Google Analytics)

The site reports to the same Google Analytics property as getaurorastudios.com (`gaId` in `config.js`). It tracks:

| What you want to know | Event in Analytics |
|---|---|
| People visited the page | `page_view` / `view_item` |
| How far they scrolled | `view_section` (proof, inside, tools, buy, faq, final_cta) |
| They clicked a Buy button, and which one | `begin_checkout` with `button_location` = nav / hero / offer / final |
| They opened a FAQ question | `faq_open` |
| They actually bought (and for how much, $9 or $29) | `purchase` |

One-time setup in Google Analytics (analytics.google.com):
1. **Admin → Data streams → your web stream → Configure tag settings → List unwanted referrals** → add `stripe.com` and `checkout.stripe.com`. (Otherwise every buyer returning from Stripe looks like a new visit.)
2. **Admin → Events** → mark `begin_checkout` and `purchase` as **key events** (`purchase` may already be).
3. In reports, filter by **Hostname = toussaint.getaurorastudios.com** to see only this site.
4. Check it works: open **Reports → Realtime** and visit the page yourself.

Notes: visitors with Do Not Track on, or an ad blocker, aren't counted, so Analytics will show a bit fewer visits than real. **Stripe's Payments page is the true count of sales and money**; Analytics shows the visits and clicks leading up to them. No emails, names or payment details are ever sent to Google.

## The 2-week special

The date lives in two places that must match: `specialEndsAt` in `config.js` (what the page shows, including the countdown) and `playbook_special_ends` in `aurora-config.php` (what is actually charged). After that moment the page shows $29 and the server charges $29 automatically. To extend the special, change both.

## Files

- `index.html`, `style.css`, `app.js`: the sales page. `thanks.html`: confirmation and download page.
- `config.js`: price display, end date, API address, support email.
- `img/`: Toussaint images from the playbook PDF, plus the Instagram and TikTok proof screenshots.
- Server code: `aurora-site/hostgator/api/lib/playbook.php`, `api/routes/playbook.php`, tests in `hostgator/tests/run.php` (`php hostgator/tests/run.php`).
