import { copyFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

// The SPA shell is `200.html` (see the adapter fallback and vercel.json).
// Cloudflare Pages serves `index.html` for unmatched paths, so publish a copy
// of the shell under that name. No application behavior depends on it.
await copyFile('build/200.html', 'build/index.html');
console.log('Cloudflare Pages SPA fallback: build/index.html');

// Finder drops these in `static/` and Vite copies them through. They are not
// assets: leaving them in ships local noise and inflates the deploy.
const noise = (await readdir('build', { recursive: true })).filter((path) =>
	path.endsWith('.DS_Store')
);
for (const path of noise) await rm(join('build', path), { force: true });
if (noise.length > 0) console.log(`removed ${noise.length} .DS_Store file(s) from build/`);
