# 01: Interaction polish acceptance

**What to build:** Finish the interaction polish so a child can immediately tell a solved word from an unsolved one, replay the current word while solving, and feel calm motion without distraction. Prove it on desktop and mobile.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] A solved bucket is visibly empty, shows a large check and its word, and no longer shows the clue image.
- [x] Unsolved buckets keep the clue image and show no check.
- [x] A labelled repeat-word button sits under the clue image and replays the current word; the header speaker still works.
- [x] Buckets arrive with a short stagger, closed buckets float gently, and solving pops the lid/check/word.
- [x] A light confetti burst plays when a word is completed; reduced-motion removes all of it.
- [x] The three-second hold reset test passes reliably on `mobile-chromium`.
- [x] `pnpm check` and the targeted level/a11y/settings E2E tests pass.
