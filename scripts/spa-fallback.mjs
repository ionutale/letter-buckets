import { copyFile } from 'node:fs/promises';

// The SPA shell is `200.html` (see the adapter fallback and vercel.json).
// Cloudflare Pages serves `index.html` for unmatched paths, so publish a copy
// of the shell under that name. No application behavior depends on it.
await copyFile('build/200.html', 'build/index.html');
console.log('Cloudflare Pages SPA fallback: build/index.html');
