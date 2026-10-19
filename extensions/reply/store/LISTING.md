# Chrome Web Store submission pack — Aurora Reply

Upload `dist/aurora-reply-0.3.0.zip` (built with `npm run package`). Images are in `store/assets/` (regenerate with `node store/make-assets.cjs`).
Before submitting: the **privacy policy must be live** — upload the website update first (it adds an "Aurora Reply" section to https://getaurorastudios.com/legal/privacy/).

## 1. Store listing tab
**Name** (≤75): `Aurora Reply — comment replies in your voice`

**Summary** (≤132): `Draft replies to your Facebook, Instagram & TikTok comments in your own voice. You read, edit and press Send.`

**Category:** Productivity   **Language:** English

**Detailed description:**

```
Aurora Reply writes replies to the comments on your Facebook, Instagram and TikTok posts — in your own voice. You read, edit and press Send yourself. Nothing is ever posted for you.

HOW IT WORKS
1. Open a post that has comments. A black ✦ Reply button appears in the corner of the page.
2. Press "Draft a reply" next to any comment. You get three options in your voice.
3. Edit the one you like and press "Use this reply". It lands in that comment's reply box. You press Send.

SOUNDS LIKE YOU
• Teach it your voice once: paste a few of your own replies, your business facts (hours, prices, delivery, links) and your tone
• It only uses the facts you give it and never invents prices, dates or promises
• Pick Friendly, Warm, Professional, Playful or Direct — or add a hint like "thank them and mention Saturday"
• Replies in the language of the comment, or the language you choose
• Voice profiles for people who run several brands

BUILT FOR BUSY PEOPLE
• Reply to unanswered comments one by one — you approve each reply
• Quick replies: your saved answers to common questions, one click and free
• Keyboard shortcuts: Alt+R, Alt+1/2/3, Alt+G, Alt+N
• Flags spam, abusive and sensitive comments so you can decide
• Finds comments in English, French, Spanish, Portuguese, German, Italian, Dutch, Japanese, Chinese, Korean, Arabic, Russian, Turkish and more

YOUR HISTORY, ON YOUR COMPUTER
• Every draft is saved in your browser: search it, star favourites, copy, reuse, export to CSV or JSON, or delete it
• A dashboard with your usage, time saved, activity and platform split — in light or dark

PRIVATE BY DESIGN
• It only reads a comment when you press "Draft a reply"
• It never presses Send, never reads private messages and never touches your password or cookies
• The comment you choose, the post caption and your voice settings are sent to Aurora's server, which asks an AI service (Anthropic) to write the drafts. The server keeps only a count of drafts — not your comments or replies
• Your voice, history and quick replies stay in your browser

FREE TO START — AURORA ACCOUNT NEEDED
Create a free account at getaurorastudios.com, copy your Aurora Reply key from My account and paste it into the extension. New accounts get a 3-day trial with every feature, then 10 free replies every month. Need more? Buy a reply pack or a monthly plan at getaurorastudios.com/reply.
Not affiliated with Facebook, Instagram, TikTok or Meta. Replies are suggestions — check them before you send and follow each platform's rules.
```

## 2. Graphics
- Icon 128×128: `icons/icon128.png`
- Screenshots (1280×800): `screenshot-1-reply-panel.png`, `screenshot-2-dashboard.png`, `screenshot-3-history.png`, `screenshot-4-voice-and-quick-replies.png`, `screenshot-5-dark-theme.png`
- Small promo tile 440×280: `promo-small-440x280.png`
- Marquee 1400×560: `promo-marquee-1400x560.png`

## 3. Privacy tab
**Single purpose:** Draft replies to comments on Facebook, Instagram and TikTok posts, in the user's own voice, and insert the chosen draft into the comment's reply box for the user to review and send.

**Permission justifications**
- `storage`: saves the user's key, voice settings, voice profiles, quick replies, reply history and preferences in the browser.
- Host permission `https://getaurorastudios.com/*`: sends the comment the user chose (plus post caption and voice settings) to Aurora's server to generate drafts and to check the license key and monthly allowance.
- Content scripts on `*.facebook.com`, `*.instagram.com`, `*.tiktok.com`: show the ✦ Reply panel on those sites, read the comments on screen only when the user opens it or asks for a draft, and place the chosen text in the reply box. It never presses Send.

**Remote code:** No. All code is in the package.

**Data usage** (tick these, untick the rest)
- Authentication information → license key (used to verify the license)
- Website content → the comment text/author and post caption the user chooses to draft a reply for
- Personal communications is NOT collected (private messages are not read)

**Certify:** data is not sold, not used for purposes unrelated to the single purpose, not used for creditworthiness or lending.

**Privacy policy URL:** `https://getaurorastudios.com/legal/privacy/`

**Support URL / homepage (Store listing tab):** support `https://getaurorastudios.com/support/`, homepage `https://getaurorastudios.com/reply/`

## 3b. Distribution tab
- **Pricing:** Free (the extension itself is free; it needs an Aurora account and has optional paid plans on the website — say so in the description, as done above).
- **Visibility:** Public.   **Regions:** all regions (or just the ones you serve).
- **Trader status** (EU/UK): already declared for Extract; it applies to the whole publisher.

## 4. Test instructions for the reviewer
1. Make a one-time reviewer code: upload `master-key-ONE-TIME.php` (included) to `public_html/api/`, open `https://getaurorastudios.com/api/master-key-ONE-TIME.php?go=1&note=chrome-reviewer&days=60&products=reply&quota=100`, copy the code it prints (shown only once), and the script deletes itself. It only works for Aurora Reply, for 60 days, 100 replies.
2. Paste this into the dashboard's **Test instructions** box (replace KEY with that code):

```
Aurora Reply needs an Aurora key. Use this reviewer key: KEY
1. Click the extension icon > "Open dashboard" > "Settings & key", paste the key, press "Save & check" (it should say "Key accepted").
2. Open any public post with comments on instagram.com, facebook.com or tiktok.com (you must be logged in to those sites).
3. A black "Reply" button appears bottom-right. Click it, press "Draft a reply" next to a comment, then "Use this reply". The text is placed in that comment's reply box. The extension never presses Send.
Nothing is posted by the extension. Voice settings, history and quick replies stay in the browser. The server keeps only a count of replies per key.
```

## 5. After approval
- Add the store link to the website's Reply page and the dashboard's "Help & support".
- Turn on the paid plan (PayPal/Stripe `reply`) when you are ready to sell keys.
