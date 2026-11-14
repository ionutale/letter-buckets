---
title: Deploy to Cloudflare Pages and publish the repo
type: task
status: open
blocked_by: [012]
created: 2026-11-14
---

## Goal

Ship the static PWA and make the source public.

## Work

- Merge the feature branch into `main`.
- Create the public GitHub repo `ionutale/letter-buckets` and push `main`.
- Deploy `build/` to Cloudflare Pages project `letter-buckets` with Wrangler.
- Verify HTTPS, install prompt, offline reload, word audio and clue images.
- Record the public URL and repo URL in the README.

## Acceptance

- [ ] Public repo exists and contains the final source.
- [ ] Cloudflare Pages deployment is live.
- [ ] Installed PWA works offline.
- [ ] README links both URLs.
