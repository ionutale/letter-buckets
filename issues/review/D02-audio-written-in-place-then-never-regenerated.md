# Interrupted audio encode leaves a corrupt clip that no later run replaces

- **Severity:** high
- **Area:** script
- **Location:** `scripts/generate_audio.mjs:116`
- **Confidence:** certain

## What happens

`convert()` hands ffmpeg the final `.mp3` path, so an interrupted or failed encode leaves a truncated but decodable file at the destination. `wordClip()` then skips any file that exists, so every later run prints `skip …` and the corrupt clip is never rewritten without `--force`. The same pattern exists in `generate_word_art.py`. The result is a permanently silent or cut-off word for one language, shipped without an error.

## Evidence

```js
// scripts/generate_audio.mjs:113-118
const ff = ['-y', '-loglevel', 'error', '-i', input, '-ac', '1', '-ar', '24000'];
if (!music) ff.push('-af', filter);
if (sfx) ff.push('-t', '3');
ff.push('-codec:a', 'libmp3lame', '-b:a', music ? '64k' : '48k', output);
const result = spawnSync('ffmpeg', ff, { stdio: 'inherit' });
if (result.status !== 0) throw new Error(`ffmpeg failed for ${output}`);
```

`output` is the published path, e.g. `static/audio/words/it/chiara/l17-w2.mp3`. On Ctrl-C ffmpeg finalises what it has and exits non-zero; on SIGKILL or a full disk it leaves a partial file. Either way the next invocation stops here:

```js
// scripts/generate_audio.mjs:150-153
async function wordClip(locale, entry, output, studioVoice) {
	if (existsSync(output) && !FORCE) {
		console.log(`skip ${output}`);
		return;
	}
```

The validator is not a reliable backstop: `scripts/validate_assets.mjs:69` only rejects clips over 20 KB and line 84 only rejects duration `< 0.15` or `> 3`, so a 1.2-second truncation of a 2-second word passes. Alternate narrators are not validated at all (see D04).

`generate_word_art.py:96-103` does the same thing with PIL: `opened.convert("RGB").save(output, "WEBP", quality=80)` writes straight to the published `.webp`, and `if output.exists() and not args.force: continue` (line 79) makes a half-written image permanent.

## Suggested fix

Encode to a temporary path next to the destination and rename only after success:

```js
const temp = `${output}.part`;
ff.push(... , temp);
const result = spawnSync('ffmpeg', ff, { stdio: 'inherit' });
if (result.status !== 0) {
	rmSync(temp, { force: true });
	throw new Error(`ffmpeg failed for ${output}`);
}
renameSync(temp, output);
```

Do the same for `generate_word_art.py` (`output.with_suffix('.tmp.webp')` then `replace`). A leftover `.part`/`.tmp` is then proof of an interrupted run rather than a file that silently survives.

## Test

Kill the script mid-encode (`SIGINT` during one word), then run it again without `--force`: the log must say `wrote …` for that word, not `skip …`. `ffprobe -show_entries format=duration` on the final file must equal the value from a clean run. A unit test can point `convert` at a fake `ffmpeg` on `PATH` that exits 1 after writing bytes, and assert the destination does not exist.
