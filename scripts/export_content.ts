import { writeFileSync } from 'node:fs';
import { CONTENT, PACKAGE_2, PACKAGE_3 } from '../src/lib/content/index.js';
import { THEME_PROMPTS } from '../src/lib/content/themes.js';

writeFileSync(new URL('./content.json', import.meta.url), JSON.stringify(CONTENT, null, 2));
writeFileSync(new URL('./content.p2.json', import.meta.url), JSON.stringify(PACKAGE_2, null, 2));
writeFileSync(new URL('./content.p3.json', import.meta.url), JSON.stringify(PACKAGE_3, null, 2));
writeFileSync(new URL('./themes.json', import.meta.url), JSON.stringify(THEME_PROMPTS, null, 2));
console.log('wrote scripts/content.json, content.p2.json, content.p3.json and themes.json');
