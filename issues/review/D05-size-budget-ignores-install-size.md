# Size budget measures the whole deploy, never the install it is meant to protect

- **Severity:** medium
- **Area:** script
- **Location:** `scripts/check_build_size.mjs:17`
- **Confidence:** certain

## What happens

The only size gate sums every file under `build/` and compares 30 MB, while the product promise the design makes is a 0.8 MB first install. The 605 KB of precached manifests (D01) passed this check without notice, and any future growth of the precache is invisible as long as the total stays under 30 MB — which it nearly does: the build is 27.12 MB today with 2.9 MB of headroom.

## Evidence

```js
// scripts/check_build_size.mjs:15-17
walk(ROOT);

const size = files.reduce((sum, file) => sum + statSync(file).size, 0);
```

```js
// scripts/check_build_size.mjs:40-43
if (size > 30 * 1024 * 1024) {
	console.error('build is over the 30 MB budget');
	process.exit(1);
}
```

That total includes all three packages, all five languages, the 1,800 alternate-narrator clips, `service-worker.js` (256 KB), the 27 manifests (605 KB) and even `build/.DS_Store`. None of it is what a first visit downloads. `docs/superpowers/specs/2026-11-17-package-downloads-design.md:15-17` promises "about 0.8 MB" and "~29 KB" for level 1; neither number is asserted anywhere.

History shows the drift: `issues/05-release-validation.md:24` recorded a 6.47 MB build, and the same script now passes at 27.12 MB — the budget was never adjusted for packages 2 and 3 and no longer expresses a decision about anything.

## Suggested fix

Add the measurement the promise actually needs, next to (or instead of) the 30 MB total:

```js
const precache = files.filter((file) => {
	const p = `/${relative('build', file)}`;
	if (p.startsWith('/art/') || p.startsWith('/audio/')) return false;
	if (p.startsWith('/manifests/')) return false; // see D01
	return true;
});
const installBytes = precache.reduce((sum, file) => sum + statSync(file).size, 0);
if (installBytes > 0.95 * 1024 * 1024) {
	console.error(`install shell is ${(installBytes / 1024).toFixed(0)} KB, budget 950 KB`);
	process.exit(1);
}
```

and keep a second budget for the whole deploy with a number that reflects the three packages (for example 40 MB), or drop it.

## Test

Add +5 MB of dummy JSON under `build/manifests/` and confirm the new check fails with an install-size message while the total stays under 30 MB. Then restore and confirm `size budget OK` plus a printed install-size line that matches the precache sum.
