# 05: No English leaks into the other four languages

**What to build:** Every visible string and accessible name is localised, and package-aware screens show the right content for the active package. This covers the level map's themes and aria labels, chapter tabs for Package 3, the Word Book chip labels, the word panel's close label, letter tile labels, the bucket group label, the Package 3 lock state, the about text, the package switch group label, and a banner that stays hidden across levels.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The level map shows the active package's themes, not Package 1's (`C05`)
- [ ] Chapter tabs render Package 3's chapters (`C14`)
- [ ] Locked-level and level-state announcements name the level actually tapped (`C06`, `C07`)
- [ ] All hardcoded labels are moved into messages: word panel close (`C09`), letter tiles (`C10`), bucket group (`C11`), about text (`C13`), package switch group (`C21`)
- [ ] The Word Book chip label is localised and names the word (`C15`)
- [ ] A locked package exposes its locked state to assistive technology (`C12`)
- [ ] The install banner does not stay hidden on later levels (`C16`)
- [ ] Every locale has the same message keys, verified by a test
