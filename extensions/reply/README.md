# Aurora Reply (v0.1.0 — first version)

A Chrome extension that drafts replies to **comments** on Facebook, Instagram and TikTok in the account owner's own voice.
A person always reads, edits and sends the reply — the extension never presses Send.

## How it works
1. The owner opens a post and clicks **✦ Reply** (bottom-right of the page; it only appears where comments are visible).
2. They pick a comment from the list (or click **Pick a comment** and click one on the page).
3. The extension sends *that comment, the post caption and the owner's voice settings* to `https://getaurorastudios.com/api/reply/draft`.
4. The server checks the key and the monthly quota, asks Claude (Anthropic) for three drafts, and returns them.
5. The owner edits one and presses **Use this reply**; it is put into the site's own reply box (after the @mention the site adds). The owner sends it.

Comments are found from the **Reply** button every comment has, not from site-specific class names, so it survives most layout changes.
English-language pages only in v0.1 (the button is found by the word "Reply").

## Server (HostGator PHP) — files in `aurora-site/hostgator/api`
* `routes/reply.php`, `lib/reply.php` — `POST /api/reply/draft` and `POST /api/reply/status`.
* Access: an **access code** in `~/aurora-master-keys.json` (`"products": ["reply"]` or `null`, optional `"quota"`), or a real license once a `reply` plan exists
  (`plan_products('reply')` already maps to the `reply` product). Config `reply_beta_all_licenses` lets every active/trial Aurora license try it with `reply_beta_quota` drafts.
* Config in `~/aurora-config.php`: `anthropic_api_key` (**secret — never in the extension or the repo**), `reply_model` (default `claude-haiku-5-5`),
  `reply_model_best` (default `claude-sonnet-5-5`), `reply_monthly_quota` (default 1500).
* Usage is counted per key per month in the `reply_usage` table (created automatically; also in `schema.sql`). Comments and replies are **not** stored.
* The call to Anthropic is plain HTTPS (cURL): the hosting plan has no Composer. It uses structured output (`output_config.format` JSON schema) and `effort: low`.
* Everything that came from a web page (comment, caption, voice settings) is wrapped in tags with a random boundary and the system prompt says it is data, not instructions.
  The model may flag a comment as `spam`, `abusive` or `sensitive`; the panel shows that.

## Tests
```
npm test            # comment finding + panel + settings (fixtures shaped like the three sites)
npm run test:ext    # the real unpacked extension in Chromium, with a stand-in API
npm run test:chain  # real extension -> real PHP API (SQLite) -> stand-in for the AI service
npm run test:php    # the PHP API suite (includes 24 Reply checks)
```
**Not covered by tests:** the live sites' real pages (selectors are heuristics) and a real call to Anthropic.

## Packaging
`npm run package` → `dist/aurora-reply-0.1.0.zip` (the extension) and `dist/aurora-reply-backend-update.zip` (extract into `public_html`).

## Not in v0.1 (ideas)
Direct messages (deliberately excluded), other languages for the Reply button, learning from the final posted text, a `reply` plan in PayPal/Stripe, a website page.
