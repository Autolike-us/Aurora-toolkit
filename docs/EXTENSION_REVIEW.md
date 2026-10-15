# Review of the original uploads

Reviewed the uploaded manifests, READMEs, worker/message paths, engines, page action code, packaging scripts, and tests before designing the storefront. Attached documentation describes the uploaded projects; it does not supply instructions overriding the user's website request.

| Upload | Manifest version | Features used in storefront copy |
| --- | --- | --- |
| FB-Growth-V1-main | 2.0.29 | Post reactions, comments, shares, follow/unfollow, friend requests, group joins; page/profile/group/hashtag/feed discovery |
| IG-Growth-V1-main | 2.7.1 | Likes, follows, explicit unfollows, comments; profiles, followers/following, likers/commenters, hashtags, locations, direct posts; applicable age/video filters |
| TK-Growth-V1-main | 1.7.0 | Likes, follows, explicit unfollows, comments; profiles, followers/following, video commenters, hashtags, video/photo posts; CSV history export |

All are Manifest V3 extensions, minimum Chrome 110. They use local task state, preview mode, pacing, daily caps, activity history, pause/resume/stop, and desktop notifications. Social account sign-in occurs in the existing website tab. Content scripts and background workers cooperate to execute tasks; they are not server-side social integrations.

The original uploads have **no license checks, billing system, remote licensing backend, or Chrome Web Store listing links**. Their historical documentation explicitly says no subscription is required. Some README version headings lag the actual manifest; the storefront uses manifest versions.

Facebook also requires the `debugger` permission for native reaction input. TikTok does not implement Instagram location discovery, liker lists, DMs, scheduling, or guaranteed growth. Facebook does not implement Marketplace/messaging. The storefront avoids presenting those as features.

## Baseline validation

All uploaded `npm test` commands passed before changes: Facebook 38, Instagram 48, TikTok 57 tests, 143 total. They cover planning, workers, and (Instagram/TikTok) report output using mocks. Historical README browser/live claims were not treated as current verification.

## Subscription edition changes

- A shared license client, per-studio endpoint configuration, and activation page.
- License checks before task starts, resumes, dispatches, native Facebook input, and during long content steps.
- Trial/paid expiry checked in content steps. Long steps revalidate through the trusted background worker every minute.
- Content scripts cannot save, retrieve, or clear license keys through the activation message handlers. Only extension pages can manage keys.
- Removing a license pauses the active job; platform actions, selectors, confirmation logic, receipts, and pacing are preserved.
- New endpoint host permissions; packages must be regenerated for the real HTTPS domain.
- Historical no-license UI footers replaced, and README override notes added.
- Existing worker fixtures now use a mocked approved license server; additional worker tests reject unlicensed starts and content-script activation commands.

Website mock UI is explicitly illustrative. Passing offline checks does not prove installed-extension compatibility with every live Facebook/Instagram/TikTok layout. Validate a one-target preview after installation, then only a live action the customer intends to perform.
