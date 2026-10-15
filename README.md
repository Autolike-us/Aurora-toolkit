# Aurora Series

A responsive HTML/CSS/JavaScript storefront, a FastAPI + SQLite account and subscription service, and licensed editions of the three uploaded Chrome extensions. No frontend build is required.

## Offer

One subscription and license unlock Facebook, Instagram, and TikTok. The customer approves automatic billing through Stripe or PayPal:

1. Three days free after provider approval.
2. $10 USD per month for the first three paid months, covering all three extensions.
3. $30 USD per month thereafter for all three ($10 per extension).

Individual studio purchases after the promotion are not implemented. Cancellation stops renewals. Stripe preserves access until the current period ends; PayPal cancellation ends access immediately. The offer, increase, and provider-specific cancellation behavior are disclosed on the website.

## Run locally

```bash
cd /workspace/personal-ig-toolkit
python -m venv .venv
.venv/bin/python -m pip install -r requirements-lock.txt
.venv/bin/python scripts/prepare_extensions.py
.venv/bin/python -m uvicorn server:app --host 0.0.0.0 --port 8000
```

The service provides the storefront and `/health`. In development, accounts work, but checkout is deliberately disabled without complete merchant configuration and an HTTPS `PUBLIC_URL`. No fake subscription or license is issued from a successful return URL. State persists in `.data/aurora.db`; do not expose that directory as static content.

`public/index.html` can also be inspected as the HTML template, but account and checkout features require the Python server.

## Checks

```bash
.venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v
node --test tests/license.test.cjs
cd extensions/facebook && npm test
cd ../instagram && npm test
cd ../tiktok && npm test
```

With the development server running, Python Playwright and Chromium installed, run `python tests/browser_smoke.py`. It checks four viewport widths, all product dialogs, account creation, unconfigured checkout, sign-out, FAQ, privacy, and JavaScript errors. Provider tests mock official API responses; they do not establish live or sandbox merchant compatibility.

## Project layout

- `public/`: the standalone UI template and browser behavior.
- `server.py`: authentication, checkout, verified webhooks, canonical subscription reconciliation, downloads, cancellation, and license validation.
- `extensions/`: the uploaded extension source plus activation pages and license gates.
- `scripts/prepare_extensions.py`: creates endpoint configuration and installable ZIPs in ignored `artifacts/`.
- `docs/EXTENSION_REVIEW.md`: review of the three original uploads, before website design.
- `docs/PAYMENTS.md`: merchant setup and required sandbox validation.

Use the existing checkout for this isolated cloud task; do not create an additional Git worktree. Source is published on GitHub; running the full backend requires a separate deployment.

## GitHub Pages design preview

The `gh-pages` branch contains a standalone static design preview. In GitHub repository **Settings → Pages**, select **Deploy from a branch**, branch **gh-pages**, folder **/ (root)**, then save. The expected project address is `https://autolike-us.github.io/Aurora-toolkit/` once GitHub finishes deployment.

This preview supports the design, product dialogs, FAQ, and trial dialog. Accounts and payments are intentionally disabled; GitHub Pages cannot run the Python service. No API calls or trial charges are made by the static preview.

To rebuild after design changes, run `python scripts/build_pages.py` and publish the contents of `artifacts/pages/` to `gh-pages`. This generates relative asset paths so the project URL works. Deploy the full Python app separately to test accounts, licensing, and merchant integrations.

## Deployment boundaries

This is a tested local implementation, not a live commercial launch. Before accepting customers, configure and sandbox-test both merchant accounts, deploy behind HTTPS with a stable origin and persistent database, and regenerate extension packages for that origin. Add the operator's business identity, support contact, retention/refund terms, and any required consumer disclosures in the website's terms dialog.

Password reset, email verification/delivery, refund administration, chargeback handling, account deletion UI, automated database backups, and choosing individual studios after the offer are not implemented. A second trial on the same account is rejected; preventing abuse across newly created email accounts requires verified identity and an explicit business policy. Refunds do not automatically cancel subscriptions: handle both operations in the merchant dashboard before treating a refund as license revocation.

License keys are hashed on the server, with the plaintext returned once when generated. Extensions store their key in Chrome local storage and revalidate at least once per minute while active; in-progress clicks cannot be undone. Failed validation blocks new work. Customer-side JavaScript can be modified by its owner: license checks in an unpacked extension are not tamper-proof DRM. Chrome Web Store publication and live social-site verification are separate steps; no live social actions were run here.
