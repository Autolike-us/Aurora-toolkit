# Chrome Web Store submission pack — Aurora Reply

Upload `dist/aurora-reply-1.1.0.zip` (built with `npm run package`). Images are in `store/assets/` (regenerate with `node store/make-assets.cjs`).
Before submitting: the **privacy policy must be live** — upload the website update first (it adds an "Aurora Reply" section to https://getaurorastudios.com/legal/privacy/).

## 1. Store listing tab
**Name** (≤75): `Aurora Reply — comment replies in your voice`

**Summary** (≤132): `Draft replies to your Facebook, Instagram & TikTok comments in your own voice. You read, edit and press Send.`

**Category:** Productivity   **Language:** English

**Detailed description:**

```
Aurora Reply writes replies to comments — and new comments under posts — on Facebook, Instagram and TikTok, in your own voice. You read, edit and press Send yourself. Nothing is ever posted for you.

HOW IT WORKS
1. Open a post that has comments (on Instagram and TikTok, open the comments first). A black ✦ Reply button appears in the corner of the page.
2. Press "Draft a reply" next to any comment. You get three options in your voice.
3. Or press "Draft a comment" to write a new comment under the post itself, in a style you pick: Friendly, Funny, Serious, Professional, Supportive or Curious.
4. Edit the one you like and press "Use this reply" (or "Use this comment"). On Facebook and Instagram it lands in that comment's reply box; on TikTok it is copied and you paste it (Ctrl+V). You press Send.

SOUNDS LIKE YOU
• Teach it your voice once: paste a few of your own replies, your business facts (hours, prices, delivery, links) and your tone
• It only uses the facts you give it and never invents prices, dates or promises
• Pick Friendly, Warm, Professional, Playful or Direct for replies, and Funny, Serious, Supportive or Curious for new comments — or add a hint like "thank them and mention Saturday"
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
• It only reads a comment or a post when you press "Draft a reply" or "Draft a comment"
• It never presses Send, never reads private messages and never touches your password or cookies
• The comment you choose, the post caption and your voice settings are sent to Aurora's server, which asks an AI service (Anthropic) to write the drafts. The server keeps only a count of drafts — not your comments or replies
• Your history stays in your browser. Your voice profiles and quick replies are backed up to your Aurora key so a reinstall can restore them (you can turn this off)

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
**Single purpose:** Draft replies to comments, and comments under posts, on Facebook, Instagram and TikTok, in the user's own voice, and insert the chosen draft into the comment box for the user to review and send.

**Permission justifications**
- `storage`: saves the user's key, voice settings, voice profiles, quick replies, reply history and preferences in the browser.
- Host permission `https://getaurorastudios.com/*`: sends the comment the user chose (plus post caption and voice settings) to Aurora's server to generate drafts and to check the license key and monthly allowance.
- Content scripts on `*.facebook.com`, `*.instagram.com`, `*.tiktok.com`: show the ✦ Reply panel on those sites, read the comments on screen only when the user opens it or asks for a draft, and place the chosen text in the reply box. It never presses Send.

**Remote code:** No. All code is in the package.

**Data usage** (tick these, untick the rest)
- Authentication information → license key (used to verify the license)
- Website content → the comment text/author and post caption the user chooses to draft a reply for, plus the voice profiles and quick replies the user writes (optionally backed up to their key)
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
2. In the dashboard's **Test instructions** tab, tick **Sign-in required** and enter the login of a test account (see "Reviewer test accounts" below), then paste this into the box (replace KEY and VIDEO-LINK):

```
Aurora Reply needs an Aurora key. Use this reviewer key: KEY
A 1-minute screen recording of the whole flow: VIDEO-LINK

1. Click the extension icon > "Open dashboard" > "Settings & key", paste the key, press "Save & check" (it says "Key accepted").
2. Open a post with comments on facebook.com, instagram.com or tiktok.com. Those sites need a login: use the test account above (Facebook/Instagram). On Instagram and TikTok, first open the comments by clicking the speech-bubble icon.
3. A black "Reply" button appears bottom-right. Click it, press "Draft a reply" next to a comment, then "Use this reply".
   - Facebook and Instagram: the text is placed in that comment's reply box.
   - TikTok: the reply is copied; click the comment box and paste it (Ctrl+V).
4. The extension never presses Send and never posts anything. You read, edit and send the reply yourself.
Data: comment text, post caption and the user's voice settings go to getaurorastudios.com to write the draft. History stays in the browser. Voice profiles and quick replies are backed up to the user's key (optional, on by default).
```

### Reviewer test accounts (you create these, I can't)
Facebook, Instagram and TikTok only allow people to open accounts themselves, so please make one throwaway account per site you list, add a few comments from another account of yours so there is something to reply to, and put the logins in the box above.
- Use an email that is only for this (for example reviewer@yourdomain), turn two-step login OFF on these accounts, and don't connect any real page or card to them.
- The platforms can lock a new account when someone logs in from a new place. Check each login still works the day you submit, and keep the screen recording as the backup.
- TikTok usually lets anyone view a video and its comments without logging in (check on your own), so a test account matters most for Facebook and Instagram.

## 5. After approval
- Add the store link to the website's Reply page and the dashboard's "Help & support".
- Turn on the paid plan (PayPal/Stripe `reply`) when you are ready to sell keys.


## 6. Version 1.1.0 — what changed (for the "what's new" / update review)
- New: "Draft a comment" writes a new comment under a post in a chosen style (Friendly, Funny, Serious, Professional, Supportive, Curious). Same permissions as 1.0.0 — no new permission, no new site. The person still reads, edits and presses Send; nothing is posted automatically and there is no bulk mode.
- Replies and comments follow the language of the comment/post; translated comments are read in their original language.
- Update the **Single purpose** and **Description** in the console with the text above.


## 7. Version 1.2.0 — what changed (for the "what's new" / update review)
- New **Write** tab in the dashboard: the user describes a post and gets 3 caption options, 3 hooks and hashtags in their own voice, and copies them. Nothing is posted by Aurora and nothing is inserted into a page; the user copies the text.
- New **Ideas from your comments**: the questions followers keep asking, found on the user's computer from their own reply history; the user can turn one into a post. Only the chosen question text is sent when they press "Write a post".
- Same credits as replies (1 credit per set). **No new permission, no new host, no new site.**
- **Single purpose** (update the console text): "Draft replies to comments, comments under posts, and captions for the user's own posts on Facebook, Instagram and TikTok, in the user's own voice, for the user to review, copy or insert and send themselves."
- **Data usage:** unchanged categories. In Write, the topic the user types (or the chosen follower question) and the voice settings are sent to Aurora's server and an AI service to write the suggestions; not stored.
- **Description:** add under "SOUNDS LIKE YOU": "• Write: captions, hooks and hashtags for your own posts in your voice, plus post ideas from the questions your followers keep asking (you copy and post them yourself)". Replace the opening line with: "Aurora Reply writes replies to comments — and captions for your own posts — on Facebook, Instagram and TikTok, in your own voice."
- Upload `dist/aurora-reply-1.2.0.zip`. Add one screenshot of the Write tab (1280×800).
