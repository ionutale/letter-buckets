import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'build';
const files = [];

function walk(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) walk(path);
		else files.push(path);
	}
}

walk(ROOT);

const size = files.reduce((sum, file) => sum + statSync(file).size, 0);
const images = files.filter((file) => /\/art\/levels\/l\d{2}\.webp$/.test(file));
const wordImages = files.filter((file) => /\/art\/words\/[a-z]{2}\/l\d{2}-w\d\.webp$/.test(file));
const clips = files.filter((file) => /\/audio\/words\/[a-z]{2}\/l\d{2}-w\d\.mp3$/.test(file));

console.log(`build: ${(size / 1024 / 1024).toFixed(2)} MB`);
console.log(
	`images: ${images.length}, word images: ${wordImages.length}, word clips: ${clips.length}`
);

const largest = files
	.map((file) => ({ file, bytes: statSync(file).size }))
	.sort((a, b) => b.bytes - a.bytes)
	.slice(0, 10);
for (const item of largest) console.log(`${(item.bytes / 1024).toFixed(1)} KB ${item.file}`);

if (size > 20 * 1024 * 1024) {
	console.error('build is over the 20 MB budget');
	process.exit(1);
}
if (images.length !== 50) {
	console.error(`expected 50 level images, found ${images.length}`);
	process.exit(1);
}
if (wordImages.length !== 750) {
	console.error(`expected 750 word images, found ${wordImages.length}`);
	process.exit(1);
}
if (clips.length !== 750) {
	console.error(`expected 750 word clips, found ${clips.length}`);
	process.exit(1);
}
console.log('size budget OK');
