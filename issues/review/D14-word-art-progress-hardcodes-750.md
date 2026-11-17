# Word-art progress hardcodes 750 and never checks the total

- **Severity:** low
- **Area:** script
- **Location:** `scripts/generate_word_art.py:107`
- **Confidence:** certain

## What happens

`generate_word_art.py` computes an `expected` count and never uses it, while its progress line and ETA hardcode 750 for every package and subset. `--package p2` and `--only 1,2` report a wrong remaining count and absurd time estimate, and a run that produced nothing (all files already present, or a stale content file) still exits 0 with `done: 0 images`, which reads like success.

## Evidence

```python
# scripts/generate_word_art.py:65
expected = len(list(content.values())[0]["levels"]) * len(content) * 3
```

`expected` is not referenced anywhere else in the file (the only other use of `750` is the hardcoded pair below).

```python
# scripts/generate_word_art.py:104-112
total += 1
elapsed = time.time() - started
rate = elapsed / total
remaining = (750 - total) * rate
print(
	f"{output.relative_to(ROOT)}  {total}/750  "
	f"{rate:.1f}s/img  ~{remaining / 60:.0f} min left",
	flush=True,
)
```

For `--package p2 --all` the true total is 750, so the number is accidentally right; for `--package p2 --only 10` it claims `~…/750` for 15 images, and for `--package p2 --locale it` it reports 150 images against a 750 denominator. The `--all` flag is required but `--package`/`--locale`/`--only` are not accounted for. Since every failure path in the loop is a `continue` (existing output, line 79), a 0-image run is indistinguishable from a finished one except by the `done:` line.

## Suggested fix

Use `expected` and track what was actually written:

```python
def target_count(content, locale_filter, only):
    locales = [locale_filter] if locale_filter else list(content)
    levels = [l for l in content[locales[0]]["levels"] if not only or l["id"] in only]
    return sum(len(l["words"]) for l in levels) * len(locales)
```

Print `total/target`, and at the end fail when `total != target`:

```python
if total != target:
    raise SystemExit(f"generated {total} of {target} images")
```

## Test

`python3 scripts/generate_word_art.py --package p2 --locale it --all --only 1` must print `… 3/3` and `done: 3 images`, and must exit non-zero when the images already exist and `--force` is absent, instead of reporting success.
