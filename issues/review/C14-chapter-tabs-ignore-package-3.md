# Chapter strip and Word Book label Package 3 with Package 1's chapters

- **Severity:** medium
- **Area:** i18n
- **Location:** `src/lib/components/ChapterTabs.svelte:14`
- **Confidence:** certain

## What happens

Package 3 reuses Package 1's chapter names. Its first chapter is "Feelings / Faces / Friends / People who help / …", but the strip above the level map calls it "Home & Garden" and the Word Book repeats the same headings, so the player is told the wrong topic for every chapter of the package.

## Evidence

```ts
15		packageId === 'p2'
16			? [ … { label: m.chapter_n({ n: 1 }) } … ]
...
23			: [
24					{ n: 1, label: m.chapter_home(), icon: 'home' },
25					{ n: 2, label: m.chapter_farm(), icon: 'farm' },
```

Only `'p2'` is special-cased; `'p3'` falls through to the Package 1 names. Package 3 chapter 1 is "Feelings":

```ts
// src/lib/content/levels.en.p3.ts:7-9
level(1, 'Feelings', 'HAPPY', 'SAD', 'CALM'),
level(2, 'Faces', 'SMILE', 'EYES', 'NOSE'),
level(3, 'Friends', 'FRIEND', 'SHARE', 'HUG'),
```

The Word Book duplicates the mapping at `src/routes/words/+page.svelte:28-36`, so both navigation surfaces show the wrong chapter names for p3.

## Suggested fix

Invert the condition so only Package 1 gets the named chapters — `packageId === 'p1' ? [m.chapter_home(), …] : [m.chapter_n({ n }) …]` — or add explicit `chapter_p3_*` messages. Apply the same change in `src/routes/words/+page.svelte`.

## Test

Seed p1 at 50 and p2 at 50, select Package 3 on `/en/`, open `/en/levels`, and assert the first `.tab` does not read "Home & Garden" (it should read "Chapter 1"); repeat on `/en/words` for the first `<h2>`.
