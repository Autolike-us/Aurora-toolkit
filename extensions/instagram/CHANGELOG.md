# Changelog

## 2.7.1
- While a profile walk is running, the panel and studio now show live progress (current post, likes done so far, the waiting pause) and count each like as it happens, instead of staying at 0/N until the whole profile finishes.

## 2.7.0
- Like (and comment) now work the way you would by hand: Aurora opens the first post of a profile in its popup, acts, presses the popup's Next arrow and repeats until the posts-per-profile / task limit, then closes the popup. No more loading each post by URL, so Instagram redirects can no longer stop the task. Already-liked posts are skipped, the last post ends the walk, photo-carousel arrows are ignored, and previews walk without clicking.
- Hashtag/location sources and direct post links still open posts by URL.

## 2.6.2
- The Live session card and the on-page Aurora panel show a running counter again: actions done / limit, steps left and a countdown to the next step.

## 2.6.1
- Reels: `/reels/<id>/` links count as the same reel as `/reel/<id>/`, so an Instagram redirect between them no longer pauses the task; reel pages and post popups without an article/main wrapper are now found.

## 2.6.0
- Studio refresh (interface only; automation unchanged): always-visible PREVIEW/LIVE bar (LIVE tucks away after 2 s), the Live choice stays on until the task finishes or is stopped, fields the chosen action does not use are hidden, collapsible Pace & limits and Advanced sections, a one-line summary above Start, sidebar badges, activity filters and search, Saved setups under the Live session card, a real factory reset, a first-run checklist, Ctrl+Enter to start, a single scrollbar and no pinned bars in the popup, and a redesigned on-page Aurora panel.

## 2.5.2
- The popup closes and the on-page panel folds away once a task starts running.

## 2.5.1
- Starting a task now reuses the Instagram tab you already have open instead of opening a new one.

## 2.5.0
- New: the form is remembered when the popup closes, a Reset to defaults button, and named saved setups (save, load, rename, delete).

## 2.4.1
- Fix: comments now wait for the post page to finish loading before typing, restore text if Instagram resets the box while typing, and reuse leftover text from an interrupted attempt instead of stopping.

## 2.4.0
- **Human-like typing.** Comments are typed one character at a time with an uneven rhythm and thinking pauses (capped at about 90 seconds) instead of being pasted in one go; line breaks become spaces; typing is checked before Post is pressed.
- A human-length pause (about 1–2.5 s) before every action.
- **Captcha handling.** A captcha, verification page or "try again later" dialog is reported clearly; for captchas Aurora brings the Instagram tab to the front, notifies you and continues by itself once it is solved. Identity checks and "try again later" warnings need a manual Resume.

## 2.3.1
- **Fixed: false "verification requested" stops.** A captcha now counts only when it is actually on screen with a real size and content; empty captcha placeholders that the page keeps around no longer stop the task. When a warning does stop a task, the debug log names the element that triggered it.

## 2.3.0
- **Faster start.** The pacing wait now applies after each action, not after reading a profile or skipping a post, so the first action begins about 10 seconds after you press Start instead of waiting a full delay first. The wait between actions is unchanged (never shorter than your setting, plus the random extra).

## 2.2.2
- **Your own posts are never liked or commented on**; they are skipped with a message (parity with the TikTok build).

## 2.2.1
- **Fixed: comment steps stopped with `Cannot read properties of null (reading 'querySelectorAll')`.** Instagram can replace the comment box while text is typed; Aurora now looks the box up fresh each time instead of holding on to one element, and confirms the comment against the live page. Nothing was ever submitted when this error occurred.
- Page helpers no longer throw when an element disappears mid-step; the debug log now includes the page-side error stack.

## 2.2.0
- **Debug log**: a rolling activity log with a one-click **Copy report** (studio tab, paused banner and on-page panel). Failed steps record a page trace and the Check page report automatically.
- Instagram posts, carousels and reels were already supported through `/p/` and `/reel/` links.

## 2.1.0
- Parity with the TikTok build: finish immediately at the action limit; wait never shorter than the setting plus 0–40% random extra; optional daily action cap.
- Interrupted live actions are detected and never re-sent; page-load errors retry up to 3 times (nothing that could have clicked is retried).
- Alerts: one status notification (replaced, not stacked) with one-click **Resume** for load-type pauses; badge; banner; pulsing on-page button.
- The page-warning scan only looks at dialogs, alerts and captcha widgets, at most every 1.5 s.
- Content script is re-attached automatically after an extension reload.
- Profile links with tracking parameters (e.g. `?hl=en`) are recognised as the same profile.
- **Check page** report, progress line, **Clear history**, history capped at 5,000, receipts pruned after 90 days (comments kept), CSV export protected against formulas.
- Removed stray byte-order marks from two scripts.
- Tests (previously none) and a GitHub Action; `npm run package` builds an installable zip.

## 2.0.0
- Instagram-themed studio, icons, inline live confirmation (no browser dialog), skip private/empty profiles.
