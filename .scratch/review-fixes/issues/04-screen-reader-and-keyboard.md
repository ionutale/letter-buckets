# 04: The game is playable with a keyboard and a screen reader

**What to build:** Every interactive flow works without a pointer and is announced correctly. Focus moves into the word panel and the level-complete dialog when they open and returns to the bucket that opened them. Reset progress can be triggered from the keyboard. A repeated wrong placement is announced. Touch targets meet 44 px, and the toast is a live region that exists before its text does.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Opening a bucket moves focus into the word panel; closing it returns focus to that bucket (`C02`, `C08`)
- [ ] The level-complete dialog traps focus while open and restores it on close (`C02`)
- [ ] Reset progress is operable by keyboard, not only by a three-second pointer hold (`C04`)
- [ ] A repeated wrong placement is announced to assistive technology (`C17`)
- [ ] The toast live region exists before text is inserted (`C19`)
- [ ] Touch targets are at least 44 px (`C18`)
- [ ] The coach mark is inside the modal semantics it claims (`C20`)
- [ ] Focus ring contrast reaches 3:1 against its background (`A08`)
- [ ] Axe stays clean on home, map, level, word panel, Word Book and settings
