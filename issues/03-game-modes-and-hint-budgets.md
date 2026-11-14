# 03: Game modes and hint budgets

**What to build:** Three selectable game modes — easy with unlimited hints, medium with 15 manual hints per chapter, hard with 5 per chapter — with a visible counter and a disabled hint button when the reserve is empty.

**Blocked by:** 02.

**Status:** done

- [x] Settings offer easy/medium/hard with a short explanation and persist the choice.
- [x] Easy never decrements.
- [x] Medium allows 15 manual hint presses per chapter; hard allows 5.
- [x] Automatic hints after ten seconds stay free and do not consume the reserve.
- [x] One manual press spends one hint, not the whole three-step chain.
- [x] At zero, the hint button is disabled and shows 0; normal play and automatic hints still work.
- [x] Budgets are per locale and chapter, survive reload, and switching modes does not create free refills.
- [x] Unit tests cover accounting; E2E covers selection, decrement and persistence.
