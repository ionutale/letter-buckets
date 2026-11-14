# 03: Game modes and hint budgets

**What to build:** Three selectable game modes — easy with unlimited hints, medium with 15 manual hints per chapter, hard with 5 per chapter — with a visible counter and a disabled hint button when the reserve is empty.

**Blocked by:** 02.

**Status:** ready-for-agent

- [ ] Settings offer easy/medium/hard with a short explanation and persist the choice.
- [ ] Easy never decrements.
- [ ] Medium allows 15 manual hint presses per chapter; hard allows 5.
- [ ] Automatic hints after ten seconds stay free and do not consume the reserve.
- [ ] One manual press spends one hint, not the whole three-step chain.
- [ ] At zero, the hint button is disabled and shows 0; normal play and automatic hints still work.
- [ ] Budgets are per locale and chapter, survive reload, and switching modes does not create free refills.
- [ ] Unit tests cover accounting; E2E covers selection, decrement and persistence.
