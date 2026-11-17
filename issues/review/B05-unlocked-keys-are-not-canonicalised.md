# `unlocked` keys are kept in whatever form the save used, inflating the Word Book count above 150

- **Severity:** low
- **Area:** storage
- **Location:** `src/lib/storage/save.ts:186-195`
- **Confidence:** certain

## What happens

The sanitiser validates `unlocked` keys with a regex that captures the level number, but stores the *raw* key instead of rebuilding it with `wordKey(level, wordIndex)`. Keys such as `"01:0"` or `"09:2"` are therefore kept alongside their canonical twins (`"1:0"`, `"9:2"`). Every consumer looks words up with the canonical key, but the Word Book and home screens count `Object.keys(unlocked).length`, so a save containing aliases reports more unlocked words than exist — up to "159 of 150 words" with a full set of aliases, and a header count that does not match the number of unlocked chips.

## Evidence

```ts
// src/lib/storage/save.ts:186
if (isPlainObject(value.unlocked)) {
	for (const [key, flag] of Object.entries(value.unlocked)) {
		if (flag !== true) continue;
		const match = /^(\d{1,2}):([0-2])$/.exec(key);
		if (!match) continue;
		const level = Number(match[1]);
		if (level < 1 || level > MAX_LEVEL) continue;
		progress.unlocked[key] = true;      // keeps "01:0", not "1:0"
	}
}
```

`\d{1,2}` accepts leading zeros, and the second capture group (the word index) is never used. Verified against the module:

```
unlocked keys [ '1:0', '01:0', '02:1' ]
count shown in Word Book 3
```

for a save that represents one unlocked word (`1:0`). The count comes straight from the key list:

```ts
// src/routes/words/+page.svelte:27
const unlocked = $derived(data ? data.locales[locale].unlocked : {});
const count = $derived(Object.keys(unlocked).length);
```

while each chip is looked up canonically (`words/+page.svelte:73`: `unlocked[wordKey(level, index)]`), and `src/routes/+page.svelte:45` uses the same `Object.keys(...).length`. `markWordComplete` also only ever writes canonical keys (`save.ts:411`), so aliases can only come from a hand-edited, restored or third-party-written save — precisely what this function exists to normalise.

## Suggested fix

Canonicalise on load — accept only the exact key shape the runtime writes:

```ts
const match = /^([1-9]\d?):([0-2])$/.exec(key);
if (!match) continue;
const level = Number(match[1]);
const index = Number(match[2]);
if (level < 1 || level > MAX_LEVEL) continue;
progress.unlocked[wordKey(level, index)] = true;
```

## Test

```ts
const raw = JSON.stringify({ version: 1, locales: { en: {
	unlocked: { '1:0': true, '01:0': true, '02:1': true, '1:9': true, '51:0': true }
} } });
expect(loadSave(storage(raw)).locales.en.unlocked).toEqual({ '1:0': true, '2:1': true });
```

and, at the UI level, seed the same aliased save and assert the Word Book header reads "2 of 150 words" with exactly two unlocked chips.
