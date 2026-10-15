# Subscription edition

This copy now requires an approved Aurora subscription and online license activation. Historical release notes below describe the original uploaded version; statements about no license server no longer apply. Use License & activation in the studio. See the root README and docs for billing, packaging, and deployment.

# Aurora 2.4.0

## Update
1. Stop the old Aurora task.
2. Extract this ZIP. Copy ALL files from aurora-ig into your original unpacked extension folder, replacing existing files. This preserves history/settings.
3. Open chrome://extensions, click Reload, verify version 2.0.0.
4. Refresh Instagram tabs. Stop any old-version task and create a new one.
5. Floating Aurora button > Open full studio > choose Action and Find targets from.
6. Begin with Preview only and an action limit of 1. Preview never likes, follows, unfollows, or types/posts comments.
7. To act, uncheck Preview only and review the live-task confirmation.

Preview resets ON when the studio opens or action changes. The floating panel offers a quick profile/like preview; full options are in the studio.

## Alerts when a task stops

When a task pauses (sign-in, verification, Instagram layout problem, restart) Aurora shows a desktop notification, turns the toolbar icon badge red (`!`), pops open the on-page panel with a pulsing red button, and shows a **Resume / Stop** banner in the studio and popup. A green `ON` badge means a task is running and `✓` means it finished. Starting a live task now asks for an inline two-step confirmation instead of a browser `confirm()` dialog.

## Actions
- Like: the post itself, not its comments.
- Follow: explicit/discovered accounts, or authors of discovered posts. Already-followed/requested accounts are skipped.
- Unfollow: only usernames explicitly entered in Profiles / custom user list. Other discovery sources are disabled. Pending requests are not canceled.
- Comment: uses your exact entered text. At most one Aurora comment attempt per post per signed-in account; local receipts prevent duplicate retries. Uncertain submission pauses the task. Check Instagram manually; it will not automatically resend.

One action per task. Post age/video filters apply to post likes/comments. Posts per profile controls profile discovery. Discovery limit caps each discovery step; scans also stop after 20 scroll attempts or 3 scans without new results. Action limit counts confirmed actions or eligible previews, not skips/discovery steps.

## Inputs
- Profiles: usernames, @usernames or profile URLs separated by commas/whitespace.
- Followers / following: one username; loads the appropriate dialog.
- Commenters / likers: one post/reel URL; uses comment rows or the post likes dialog.
- Hashtag: #travel, travel, a hashtag URL or Instagram hashtag search URL. Search redirects no longer cause a navigation loop.
- Location: a specific place URL containing a numeric ID, or the ID alone. Example: https://www.instagram.com/explore/locations/114897945188014/mexico-city-mexico/
  Use Find a location to browse country, city, then a particular place. Directory URLs and plain place names are not post-feed targets.
- Direct posts: post/reel URLs separated by commas/whitespace. Both /p/ID/ and /username/p/ID/ work.

## Pacing, caps and limits

- The **first action starts quickly**: reading a profile, or skipping a post where nothing was sent, is followed by only a short natural pause (4–9 seconds).
- After every **action** (like, follow, unfollow, comment; or a preview of one) the wait is **never shorter than the seconds you set**; Aurora adds a random 0–40% on top so the rhythm is not mechanical.
- **Daily action cap** (optional, 0 = off): live actions are counted per day across tasks, and the task pauses when the cap is reached.
- Private, empty or unavailable profiles are skipped automatically; load-type errors (page still rendering) are retried up to 3 times before pausing. Nothing that could have sent a click is ever retried.
- History keeps the most recent 5,000 entries (use **Clear history**). Old like/follow receipts are dropped after 90 days; comment receipts are kept so a comment is never sent twice.

## Captcha and verification

If a captcha appears, Aurora pauses, brings the task tab to the front, shows a desktop notification and waits for you. **Solve the captcha in that tab**: Aurora notices it is gone and continues by itself (you can also press **Resume**). Identity checks ("Confirm it's you") and "slow down / try again later" warnings pause the task too, but those do not continue automatically: handle them, wait a while if asked, then press **Resume**.

## Human-like typing and pace

Comments are typed one character at a time with an uneven rhythm (about 70–190 ms per key, longer after spaces and punctuation, the odd longer pause to "think"). A very long comment is sped up so typing never takes more than about 90 seconds. Line breaks become spaces. Before every action (like, follow, unfollow, post) Aurora also pauses about 1–2.5 seconds, the way a person would before clicking.

## Debug log (for support)

Open the studio and choose **Debug log**. Aurora keeps a rolling record (last 1,500 events) of what it did: task start, each step, retries, skips, pauses and errors. When a step fails it also records what the page looked like at that moment (the **Check page** report plus a short trace).

- **Copy report** puts a ready-to-paste report on your clipboard (also available as **Copy error report** on the paused banner and in the on-page panel). **Download .txt** saves it; **Clear** empties it.
- The report contains the extension version, browser, task settings and the log. It does **not** contain passwords, cookies, tokens or your own account name. It does contain the profile/post addresses you targeted and your comment text if you ran a comment task.

## Page check (when something stops working)

On any Instagram tab open the floating **✦ Aurora** panel and press **Check page**. It lists what Aurora can see (signed in, English interface, action bar, like heart, author, profile header, follower popup, any warning) and copies the report to your clipboard. It contains counts and ✓/✗ only: no usernames or links.

## Build a package

`npm run package` writes `dist/aurora-instagram-studio-<version>.zip` with only the files Chrome needs. Unzip it and use **Load unpacked**.

## Verification
12 planning, 29 worker and 3 report tests (`npm test`) plus 39 isolated-Chromium browser checks (`npm run test:browser`; set `CHROMIUM_PATH` if Chromium is not found) run on GitHub for every push. Worker tests cover sender validation, redirects, limits/counts, completion, retries, daily cap and alerts. The browser checks simulate Instagram layouts; they do not prove compatibility with every live layout, so start with Preview and a limit of 1.
Live Instagram inspection verified hashtag redirects, location post links, likes/following dialogs and the unfollow menu. No live comments, follows or unfollows were submitted during development.
This ZIP has not yet been tested end to end as an installed extension. Start with a one-target preview, then one live action you intend to perform.

## Limits
Use Instagram in English, signed in, with the task tab open. Discovery uses rendered website content with bounded scrolling; it cannot guarantee all posts/accounts or access hidden content. Instagram changes can break selectors. Tasks pause on errors, sign-in/verification requests and detected restrictions. A click already sent may finish after pause/stop.
All extension data stays in local storage. No passwords/cookies are collected. No subscription/license checks, analytics or external servers. Existing extension permissions are unchanged.
