# 06: Publish to Cloudflare and a public repo

**What to build:** The finished PWA is live on Cloudflare and the source is in a public GitHub repository.

**Blocked by:** 05.

**Status:** done

**Live:** <https://letter-buckets.pages.dev>
**Repository:** <https://github.com/ionutale/letter-buckets>
**Cloudflare Pages project:** `letter-buckets` (production branch `main`)

- [x] The feature branch is merged into `main`.
- [x] A public `ionutale/letter-buckets` repository exists and contains the final source.
- [x] The static build is deployed to Cloudflare Pages project `letter-buckets`.
- [x] The live URL works over HTTPS.
- [x] The installed PWA reloads offline with clue images and word audio available.
- [x] README links the public site and repository.

## Notes

- Cloudflare Pages has no SPA fallback for `adapter-static`'s `200.html`, so `pnpm build` now runs `scripts/spa-fallback.mjs` to publish the same shell as `index.html`. Pages serves it for unknown paths; deep links, locale routes, and the installed PWA resolve through it.
- Deploy command: `pnpm dlx wrangler@latest pages deploy build --project-name letter-buckets --branch main` (no `--force`).
