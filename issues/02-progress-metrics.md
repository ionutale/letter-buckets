# 02: Progress metrics

**What to build:** A localized **Progressi** screen that shows how many words were completed correctly, how many needed mistakes, and the underlying correct/wrong letter attempts, per locale and per chapter.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The session reports every placement attempt and whether a completed word was first-try.
- [ ] The local save stores totals and per-chapter metrics additively, and sanitises old or corrupt saves without losing progress.
- [ ] Replaying a completed word does not double-count word totals; attempts still count.
- [ ] The Progressi view shows words completed, first-try words, words with mistakes, correct letters, wrong letters, accuracy and a five-chapter breakdown.
- [ ] The view has an empty state and is reachable from the home screen.
- [ ] Unit tests cover metrics accounting and an E2E test proves the view after a mistake.
- [ ] All new copy exists in all five locales.
