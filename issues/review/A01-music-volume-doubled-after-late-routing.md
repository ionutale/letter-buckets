# Music volume is applied twice when the music element is routed after playback starts

- **Severity:** high
- **Area:** audio
- **Location:** `src/lib/audio/index.ts:351-357` (creation), `src/lib/audio/index.ts:117` (`linkMusic`), `src/lib/audio/index.ts:137` (`connectElement`), `src/lib/audio/index.ts:187` (`syncMusicVolume`)
- **Confidence:** certain

## What happens

When `playMusic()` runs while the `AudioContext` is still suspended (the state a freshly created context starts in, and the state their own test models), the music element is played natively with `music.volume = MUSIC_VOLUME * volumes.music`. As soon as the context resumes, `linkMusic()` routes that same element into the graph — but the element's own `volume` is never reset to `1`, so the element's `volume` and the channel `GainNode` each apply the music level. The music ends up at `0.16 × 0.16 = 0.0256` (about −32 dBFS), i.e. effectively inaudible, and the music slider appears broken at low settings.

## Evidence

`playMusic` only sets the element volume at creation time, and only for the branch it happens to take:

Note that this is the normal first-load path, not an edge case: Web Audio specifies that "a newly-created `AudioContext` will always begin in the suspended state" (W3C Web Audio API, §1.1.1), and the controller's own test helper models the resume resolving a tick later (`graph.dom.test.ts:41-51`).

```ts
// src/lib/audio/index.ts:349
function playMusic(): void {
	if (muted) return;
	if (!music) {
		music = make();
		music.src = '/audio/music/loop.mp3';
		music.loop = true;
		const routed = connectElement(music, 'music');
		music.volume = routed ? 1 : MUSIC_VOLUME * volumes.music; // 0.16 when suspended
		applyGain('music');
	}
```

`connectElement` returns `false` while the context is not running (`src/lib/audio/index.ts:143-146`), so on that path the element keeps `volume = 0.16`. Later the resume handler links it in and applies the channel gain on top:

```ts
// src/lib/audio/index.ts:117
function linkMusic(): void {
	if (!context || context.state !== 'running') return;
	if (!music || routed.has(music)) return;
	connectElement(music, 'music'); // element.volume stays 0.16
	applyGain('music'); // gain target = MUSIC_VOLUME * volumes.music = 0.16
}
```

`connectElement` (`src/lib/audio/index.ts:147-151`) never touches `audio.volume`, and `syncMusicVolume` explicitly skips the element once it is routed:

```ts
// src/lib/audio/index.ts:189-196
if (music && !routed.has(music)) {
	connectElement(music, 'music');
	applyGain('music');
}
if (music && !routed.has(music) && !muted) {
	music.volume = (duckTimer === null ? MUSIC_VOLUME : DUCKED_VOLUME) * volumes.music;
}
```

The same happens after a duck: `duckMusic` sets the unrouted element to `0.04 * volumes.music` (`index.ts:209`), and if the link completes while ducked the target becomes `0.04 × 0.04 = 0.0016`.

This is a regression in commit `7fa8edb` ("let the volume sliders reach music started before the audio context"): the previous code never routed the music late, so the element volume was the only attenuation. `src/lib/audio/graph.dom.test.ts:91` ("links music into the graph once the context resumes") asserts only that `createMediaElementSource` was called, not the resulting level, so the doubled attenuation is not covered.

## Suggested fix

Make the graph the single owner of the channel level as soon as an element is routed:

```ts
// inside connectElement, after the source is connected
const source = context.createMediaElementSource(audio);
source.connect(gains[channel]);
routed.add(audio);
audio.volume = 1; // the channel GainNode applies the level from here on
return true;
```

(For `playWord`/`playSfx` this is a no-op because they already assign `volume = 1` when `routed` is true.)

## Test

Extend `src/lib/audio/graph.dom.test.ts` with a case that uses the existing `installContext('suspended')` helper and asserts the effective level rather than just routing:

```ts
installContext('suspended');
const created: FakeAudio[] = [];
const controller = createAudioController({
	createAudio: () => {
		const a = new FakeAudio();
		created.push(a);
		return a as unknown as HTMLAudioElement;
	}
});
controller.unlock();
const music = created[0];
expect(music.volume).toBeCloseTo(0.16); // native fallback while suspended
await new Promise((r) => setTimeout(r, 5)); // resume settles, music is routed now
expect(music.volume).toBe(1); // graph owns the level
expect(gainCalls.at(-1)).toBeCloseTo(0.16); // 0.16 * volumes.music applied once
```

The test fails on the current code at the `expect(music.volume).toBe(1)` assertion (it is still `0.16`).
