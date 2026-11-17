# 02: The download queue survives failure and finishes

**What to build:** A package download must always reach a truthful end state. Today a cache failure can wedge the queue, a permanent failure retries every 15 seconds forever, a package can be marked downloaded before its last file lands, a 5xx manifest is treated as "nothing to do", and a waiting service worker can arm a reload that belongs to an unrelated update.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A cache write failure does not stop the remaining files (`A03`)
- [ ] Retries are bounded with backoff, and the bar reports a failed state instead of retrying forever (`A04`)
- [ ] A package is marked downloaded only when its last file is stored (`A05`)
- [ ] A 5xx or network-error manifest is retried, never treated as complete (`A06`)
- [ ] A waiting service worker does not arm a page reload unless an update was requested (`A10`)
- [ ] Tests cover each failure mode, including a manifest that fails once and then succeeds
