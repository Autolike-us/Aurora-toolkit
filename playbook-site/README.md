# Uncle Toussaint Playbook site

Plain HTML/CSS/JS sales page for the AI Character Playbook. No build step, no server code: it runs on the same HostGator plan as getaurorastudios.com.

Suggested address: `toussaint.getaurorastudios.com` (or `playbook.`).

## Put it online (cPanel)

1. cPanel → **Domains** (or **Subdomains**) → create `toussaint` under `getaurorastudios.com`. Note the document-root folder it creates (usually `public_html/toussaint`). Turn on the free **AutoSSL** certificate for it.
2. cPanel → **File Manager** → open that folder → **Upload** the contents of this `playbook-site` folder (`index.html`, `style.css`, `app.js`, `config.js`, `.htaccess`, and the `img` folder).
3. Open the subdomain in your browser. Done.

## Add payments (the only thing to edit: `config.js`)

1. Make **two** payment links in Stripe (Payment Links), PayPal, Whop, Stan Store or Gumroad: one product at **$9**, one at **$29**. Set the link's "after payment" page to the PDF download (or let the platform deliver the file).
2. Paste them into `specialCheckoutUrl` ($9) and `regularCheckoutUrl` ($29) in `config.js` and re-upload that one file.
3. Until a link is pasted, every buy button shows "Checkout is launching shortly" instead of a broken link.

## The 2-week special

`specialEndsAt` in `config.js` is **2026-11-22 23:59 UTC**. Until then the page shows $9 with a live countdown; afterwards it shows $29 and uses the $29 link automatically. The countdown only controls what the page shows. The price someone actually pays is whatever the payment link is set to, which is why there are two links. To change the dates, edit `specialEndsAt`.

## Files

- `index.html`: the page. `style.css`: design (colors from the playbook PDF). `app.js`: price, countdown, buy buttons.
- `img/`: Toussaint images taken from the playbook PDF.
