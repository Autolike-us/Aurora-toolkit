# Aurora ecosystem: handoff (read this first)

Owner: non-technical. Wants **simple numbered steps**, never real keys/passwords in chat. Process: send **dev-unlocked** builds for testing; make/submit **release** builds only when the owner says it is done. Commit and push on branch `claude/loving-edison-mknb3w` of each repo. Commit trailers: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01HsVHP8icT7CgBM1XqRMMJT`. After a push the local "unpushed" count can be stale: run `git fetch origin +refs/heads/claude/loving-edison-mknb3w:refs/remotes/origin/claude/loving-edison-mknb3w`.

## Repos (all in /home/user)
| Product | Folder | Latest | Notes |
|---|---|---|---|
| Facebook Studio (paid, not in store) | FB-Growth-V1 | **1.4.5** | post to groups (Automatic now 1–2 min wait, no forced daily cap), several-in-one, share reels/posts to groups |
| Instagram Studio | ig-growth-v1 | 1.2.4 | feed scrolling fixed (1.2.3), movable/hideable button (1.2.4) |
| TikTok Studio | tk-growth-v1 | 1.2.3 | movable/hideable button |
| Aurora Extract (free, in store) | 3in1-extract-v1 | **0.5.1** | runs in own small window, progress card on user tab, IG list scroll fix. Store update NOT yet submitted (notes: store/UPDATE-0.5.1.md) |
| Aurora Reply (in store) | aurora-toolkit/extensions/reply | **1.2.2** | single-insert text fix, remembered tone/count, no-text comments, movable/hideable button. Store notes in store/LISTING.md section 8 |
| Website + API | aurora-site (no remote, branch master) mirror: aurora-toolkit/aurora-site | n/a | PHP API in hostgator/api |

Build: `npm run package:dev` (test) / `npm run package` (release) in each repo; zips in `dist/`. Tests: `node tests/<name>.test.cjs` with `CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome NODE_PATH=/opt/node-tools/node_modules`. Playwright launch needs `--no-proxy-server` and NOT `--disable-crashpad-for-testing` in this sandbox. FB `tests/groups.test.cjs` takes ~2.5 min: run it in the background and wait. PHP API tests: `php hostgator/tests/run.php` (185 pass).

## Facebook Studio 1.4.x (the active work)
Files: `groupposts.js` (page steps: rules, post, several-groups, share pair, list groups/items), `groupsui.js` (the "Post to groups" / "Share to groups" tab), `engine.js` (config + plan), `background.js` (queue, loadGroups, loadItems), `content.js` (dispatch), `tests/groups.test.cjs` (104 checks) and `tests/worker.test.cjs` (39).
- Step kinds: `grules`, `gpost`, `mpost` (Facebook "Add groups", up to 9), `sharepair` (reel/post to one group). Actions `post` and `shareg`.
- Modes: Assisted (person presses Post; default wait 2 min) and Automatic (needs risk box; min 5 min wait; daily cap 1-15). Daily cap counts groups/shares. Receipts prevent repeats (`post:...`, `mpost:...`, `g:share:...`). Learned flags in storage `gpFlags` (approval, promoBan, rulesRead).
- Real Facebook facts learned from the owner's reports: Share button on a reel is labelled with a counter ("Share, 22K shares"), pick the one nearest screen centre; Share window has "Share now" and "Share to a group"; group list is a dialog with `input type=search` "Search for groups" and rows `role=listitem > role=button` (click the inner button); the Share window keeps its caption box mounted but hidden under the group list; success message may not appear, so a normally closed window counts as shared (with a note); notification entries ("Unread Your reel is ready to view") must not be listed as reels; group list is read from facebook.com/groups/joins/ (worked, 14 groups); reels from `/me/reels_tab`.
- Known limits: text only for posts (no photo/video attach yet); link preview (YouTube) nudge is best-effort and unverified; assisted "closed without share" cannot be told from a skipped share.
- Server part: `POST /reply/variants` (different wording per group, 1 Reply credit each, up to 6 per call) is in aurora-site `hostgator/api` (index.php, lib/reply.php, routes/reply.php). **Owner must upload `aurora-api-variants-update.zip` to public_html** (built from the working copy; check it matches what is live). Not yet confirmed uploaded.

## Open items for the owner
1. Test Facebook Studio 1.4.5 live (load reels, share 1-2 reels to test groups, Assisted then Automatic) and send "Copy debug report" if anything stops. Owner should check groups for the 3 shares that Aurora paused on (probably went through).
2. Submit Extract 0.5.1 and Reply 1.2.2 to the Chrome Web Store (and Edge) when happy.
3. Upload the website API update (variants) and the earlier pending site items: TikTok developer-app pages (callback, /openshorts, legal edits; zip built, not deployed) and `reel-drop` (PHP clip hosting for OpenShorts; zip built, not deployed; owner must set a secret in index.php first).
4. Aurora Clips alpha (OpenShorts + Docker) and owner checklist (lawyer review of privacy/terms, Anthropic spend limit).
5. Ideas not built: attach photos/videos to group posts; "share my reel" is done; Instagram/TikTok have no groups.

## How to continue
Ask the owner what to work on, read only the relevant folder's CHANGELOG.md top entries and the failing debug report, and avoid re-reading old history.
