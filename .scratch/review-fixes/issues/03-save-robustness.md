# 03: A storage failure never breaks a level, and bookkeeping stays correct

**What to build:** Saving progress must be best-effort. If a write fails — private mode, quota, a locked device — the word and level still complete on screen. Alongside that, two bookkeeping defects are fixed: unlocked-word keys are canonicalised on load, and the first-try metric is not lost when a word is reopened.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A failed save write does not abort word or level completion (`B02`)
- [ ] Unlocked-word keys are canonicalised so equivalent keys cannot duplicate (`B05`)
- [ ] The first-try metric survives reopening a word (`B03`)
- [ ] Tests cover a storage object whose writes throw, and a save with non-canonical keys
