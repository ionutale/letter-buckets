import { randomBytes } from 'node:crypto';
import { renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';

/**
 * A hidden sibling of `target` that keeps the target's extension, so tools
 * that infer a format from the filename (ffmpeg, PIL) still work. Hidden, so a
 * killed process can never leave something that looks like a published asset.
 */
export function atomicTempPath(target) {
	const extension = extname(target);
	const stem = basename(target, extension);
	const unique = `${process.pid}-${randomBytes(4).toString('hex')}`;
	return join(dirname(target), `.${stem}.tmp-${unique}${extension}`);
}

/**
 * Run `produce(tempPath)` and only then rename the temp file over the target.
 * The rename is atomic on one filesystem, so a reader sees the old file or the
 * complete new one — never a partial write. A throw (or a producer that exits
 * non-zero) leaves the target untouched and deletes the temp file.
 */
export function atomicallyReplace(target, produce) {
	const temp = atomicTempPath(target);
	try {
		produce(temp);
	} catch (error) {
		rmSync(temp, { force: true });
		throw error;
	}
	renameSync(temp, target);
	return target;
}

/** Write `data` to `target` atomically. */
export function writeFileAtomic(target, data) {
	return atomicallyReplace(target, (temp) => writeFileSync(temp, data));
}
