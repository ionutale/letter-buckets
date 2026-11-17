import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import test from 'node:test';

import { atomicallyReplace, atomicTempPath, writeFileAtomic } from './atomic-write.mjs';

function makeDir(t) {
	const dir = mkdtempSync(join(tmpdir(), 'atomic-write-'));
	t.after(() => rmSync(dir, { recursive: true, force: true }));
	return dir;
}

test('a successful write replaces the target', (t) => {
	const dir = makeDir(t);
	const target = join(dir, 'clip.mp3');
	writeFileSync(target, 'old asset');

	writeFileAtomic(target, 'complete new asset');

	assert.equal(readFileSync(target, 'utf8'), 'complete new asset');
	assert.deepEqual(readdirSync(dir), ['clip.mp3']);
});

test('a throw mid-write leaves the original intact and removes the temp file', (t) => {
	const dir = makeDir(t);
	const target = join(dir, 'clip.mp3');
	writeFileSync(target, 'old asset');

	assert.throws(
		() =>
			atomicallyReplace(target, (temp) => {
				// A killed run has already written part of the file by now.
				writeFileSync(temp, 'truncated');
				throw new Error('render aborted');
			}),
		/render aborted/
	);

	assert.equal(readFileSync(target, 'utf8'), 'old asset');
	assert.deepEqual(readdirSync(dir), ['clip.mp3']);
});

test('the temp file is a hidden sibling and never survives the run', (t) => {
	const dir = makeDir(t);
	const target = join(dir, 'art.webp');
	writeFileSync(target, 'old art');

	const temp = atomicTempPath(target);
	assert.equal(dirname(temp), dir, 'the temp file shares the target directory');
	assert.notEqual(temp, target);
	assert.equal(basename(temp).startsWith('.'), true, 'the temp file is hidden');
	assert.equal(temp.endsWith('.webp'), true, 'the temp file keeps the target extension');

	atomicallyReplace(target, (path) => {
		assert.equal(dirname(path), dir);
		assert.equal(basename(path).startsWith('.'), true);
		assert.equal(path.endsWith('.webp'), true);
		assert.equal(path.includes(String(process.pid)), true, 'temp names are unique per process');
		assert.equal(existsSync(path), false, 'producer starts from a fresh temp path');
		writeFileSync(path, 'new art');
		assert.equal(readdirSync(dir).length, 2, 'during the write both files exist');
	});

	assert.deepEqual(readdirSync(dir), ['art.webp']);
	assert.equal(readFileSync(target, 'utf8'), 'new art');
});
