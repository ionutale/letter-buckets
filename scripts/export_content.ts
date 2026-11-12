import { writeFileSync } from 'node:fs';
import { CONTENT } from '../src/lib/content/index.js';
import { THEME_PROMPTS } from '../src/lib/content/themes.js';

writeFileSync(new URL('./content.json', import.meta.url), JSON.stringify(CONTENT, null, 2));
writeFileSync(new URL('./themes.json', import.meta.url), JSON.stringify(THEME_PROMPTS, null, 2));
console.log('wrote scripts/content.json and scripts/themes.json');
