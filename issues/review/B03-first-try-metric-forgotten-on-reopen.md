# Closing and reopening a word forgets its mistakes, so "First try" counts a retried word as clean

- **Severity:** low
- **Area:** game
- **Location:** `src/lib/game/session.svelte.ts:141` (and `:167`, `:180`, `:192`)
- **Confidence:** likely

## What happens

`mistakesThisWord` is the only record of whether a word was solved cleanly, and it is cleared by `openBucket()` and `closeWord()` as well as counted at completion. A child who places a wrong tile, closes the panel (tap close, Escape, or navigate away and back), reopens the same bucket and finishes it is reported to `onWordComplete` with `firstTry = true` while `recordAttempt` has already counted the earlier wrong placement. The progress screen then shows "First try" for a word that was not solved first try, and `wordsFirstTry + wordsWithMistakes` disagrees with `wrongPlacements` for the chapter.

## Evidence

```ts
// src/lib/game/session.svelte.ts:136
function openBucket(index: number): void {
	if (!Number.isInteger(index) || index < 0 || index > 2) return;
	openIndex = index;
	hintStep = 0;
	lastHint = null;
	mistakesThisWord = false;          // <-- clears the only mistake record
	...
// :161
function closeWord(): void {
	clearHintTimer();
	openIndex = null;
	word = null;
	hintStep = 0;
	lastHint = null;
	mistakesThisWord = false;          // <-- and again here
}
// :180
if (result.outcome !== 'placed') mistakesThisWord = true;
// :192
options.onWordComplete?.(level, index, !mistakesThisWord);
```

Reproduction: open level 5 bucket 0, drag any tile to the wrong slot (`onAttempt(..., false)` fires), press the panel close button, reopen bucket 0 — `createPuzzleState` starts a fresh puzzle, so the placement is gone but so is the mistake — solve it; `onWordComplete(5, 0, true)` is delivered even though the child already failed on that word. The same happens implicitly when the route unmounts (`onDestroy(() => session?.closeWord())` in `src/routes/levels/[level]/+page.svelte:66`): a word solved across two visits is always "first try".

The saved metric therefore measures "the final attempt was clean", while `messages/en.json:67` labels it "First try" and `src/routes/progress/+page.svelte:64-70` presents it next to "With mistakes" as a partition of completed words.

## Suggested fix

Track the mistake per word index for the lifetime of the session (and, if the label is to stay honest, across visits): keep a `Set<number>` of `mistakenWords` that `openBucket` never clears, add on a wrong placement, and pass `!mistakenWords.has(index)` to `onWordComplete`. If cross-visit accuracy matters, persist it (a `wordsWithMistakes` flag next to `unlocked`) and only award `wordsFirstTry` on the first completion.

## Test

```ts
const firstTry: boolean[] = [];
const session = createLevelSession(5, 'en', { onWordComplete: (_l, _w, clean) => firstTry.push(clean) });
session.openBucket(0);
const gaps = session.word!.spec.gaps;
session.place(session.word!.remaining.find((t) => t.letter !== session.word!.spec.word[gaps[0]] && !t.decoy)!.id, gaps[0]);
session.closeWord();
session.openBucket(0);
solveCurrentWord(session);
expect(firstTry).toEqual([false]);
```

It currently yields `[true]`.
