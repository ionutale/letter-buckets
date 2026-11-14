---
title: Release validation and snapshots
type: task
status: open
blocked_by: [006, 007, 008, 011]
created: 2026-11-14
---

## Goal

Prove the finished game is shippable before deployment.

## Checklist

- [ ] `pnpm check`
- [ ] `pnpm test` (content, puzzle, session, store, component)
- [ ] `pnpm build`
- [ ] `node scripts/validate_assets.mjs` (750 clips, 750 clues, 50 theme images, SFX)
- [ ] `node scripts/check_build_size.mjs`
- [ ] Full Playwright E2E on chromium and mobile-chromium
- [ ] `pnpm test:visual --update-snapshots` for five locales
- [ ] Manual smoke test of levels 1, 5, 10, 20 and 50 in Italian
