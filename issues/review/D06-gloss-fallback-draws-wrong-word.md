# Word-art gloss fallback can draw a different package's word

- **Severity:** medium
- **Area:** script
- **Location:** `scripts/generate_word_art.py:85`
- **Confidence:** certain

## What happens

When the namespaced gloss for a package 2/3 word is missing, the generator silently falls back to the package 1 gloss for the same `locale:level:index`, which describes a completely different word. The image is generated, saved, counted and never flagged — the child sees a clue for "cat" on a level whose word is "whisk".

## Evidence

```python
# scripts/generate_word_art.py:81-86
# Package 2 and 3 glosses are namespaced; Package 1 keeps the
# original key so its existing file still applies.
key = f"{args.package}:{locale}:{level['id']}:{index}"
legacy = f"{locale}:{level['id']}:{index}"
subject = glosses.get(key, glosses.get(legacy, entry["word"].lower()))
prompt = STYLE.format(word=subject)
```

The fallback is harmless only while `word_glosses.json` is perfectly in sync, and nothing enforces that:

- Package 1 level 1 word 1 is `CAT`, gloss `en:1:0` = `"cat"`.
- Package 2 level 1 word 1 is `WHISK`, gloss `p2:en:1:0` = `"whisk"`.

Delete or forget one `p2:` key (a new word added to `content.p2.json` without re-running `scripts/build_word_glosses.py`, which has no npm script and is not in the README regenerate list) and the generator draws `"cat"` for `WHISK` at `static/art/p2/words/en/l01-w1.webp`. The `"skipped"`/`"wrote"` log lines look normal, and `scripts/validate_assets.mjs` only checks that the file exists and is under 30 KB, so the wrong clue passes every gate.

Today all 1,500 namespaced keys are present (`word_glosses.json` has 2,250 entries: 750 legacy + 1,500 namespaced), which is exactly why the fallback has never been observed — it is a silent-corruption path waiting for the first content edit.

## Suggested fix

Make the legacy fallback package-1 only and fail loudly otherwise:

```python
if args.package == "p1":
    subject = glosses.get(key, glosses.get(legacy, entry["word"].lower()))
else:
    subject = glosses[key]  # KeyError is the right outcome
```

or, better, validate the whole set up front and exit with the list of missing keys:

```python
missing = [k for k in expected_keys if k not in glosses]
if missing:
    raise SystemExit(f"{len(missing)} glosses missing, e.g. {missing[:5]}; run build_word_glosses.py")
```

## Test

Remove one key (`"p2:en:1:0"`) from a copy of `word_glosses.json` and run `python3 scripts/generate_word_art.py --package p2 --all --only 1`: it must abort with the missing key instead of writing an image. With the real file it must print `wrote …/p2/words/en/l01-w1.webp` and `--only 1` must generate exactly one image.
