import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const root = resolve(import.meta.dirname, '..');
const content = JSON.parse(readFileSync(resolve(root, 'scripts/content.json'), 'utf8'));
const locales = process.argv.slice(2).filter((value) => value in content);
const targets = locales.length > 0 ? locales : Object.keys(content);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1660, height: 1200 }, deviceScaleFactor: 1 });

for (const locale of targets) {
	const cells = [];
	for (const level of content[locale].levels) {
		level.words.forEach((entry, index) => {
			const word = typeof entry === 'string' ? entry : entry.word;
			const path = resolve(root, `static/art/words/${locale}/l${String(level.id).padStart(2, '0')}-w${index + 1}.webp`);
			if (!existsSync(path)) {
				cells.push(`<figure><div class="missing">missing</div><figcaption>L${level.id}·${index + 1} ${word}</figcaption></figure>`);
				return;
			}
			const data = readFileSync(path).toString('base64');
			cells.push(`<figure>
				<img src="data:image/webp;base64,${data}" />
				<figcaption>L${level.id}·${index + 1} ${word}</figcaption>
			</figure>`);
		});
	}

	await page.setContent(`<!doctype html><meta charset="utf-8" />
		<style>
			body { margin: 0; padding: 12px; background: #fff; font: 14px/1.2 -apple-system, sans-serif; color: #222; }
			main { display: grid; grid-template-columns: repeat(10, 1fr); gap: 8px; }
			figure { margin: 0; text-align: center; }
			img, .missing { width: 100%; aspect-ratio: 1; border-radius: 6px; display: block; background: #eee; }
			.missing { display: grid; place-items: center; color: #999; font-size: 12px; }
			figcaption { margin-top: 2px; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
		</style><main>${cells.join('')}</main>`);
	await page.screenshot({ path: `/tmp/words-${locale}.png`, fullPage: true });
	console.log(`/tmp/words-${locale}.png`);
}

await browser.close();
