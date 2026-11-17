import { writeFileSync } from 'node:fs';
import { CONTENT, PACKAGE_2, PACKAGE_3 } from '../src/lib/content/index.js';
import { PACKAGE_THEME_PROMPTS, THEME_PROMPTS } from '../src/lib/content/themes.js';
import { DEFAULT_VOICE, ITALIAN_VOICES } from '../src/lib/content/voices.js';

writeFileSync(new URL('./content.json', import.meta.url), JSON.stringify(CONTENT, null, 2));
writeFileSync(new URL('./content.p2.json', import.meta.url), JSON.stringify(PACKAGE_2, null, 2));
writeFileSync(new URL('./content.p3.json', import.meta.url), JSON.stringify(PACKAGE_3, null, 2));
writeFileSync(new URL('./themes.json', import.meta.url), JSON.stringify(THEME_PROMPTS, null, 2));
writeFileSync(
	new URL('./themes.p2.json', import.meta.url),
	JSON.stringify(PACKAGE_THEME_PROMPTS.p2, null, 2)
);
writeFileSync(
	new URL('./themes.p3.json', import.meta.url),
	JSON.stringify(PACKAGE_THEME_PROMPTS.p3, null, 2)
);
writeFileSync(
	new URL('./voices.json', import.meta.url),
	JSON.stringify({ default: DEFAULT_VOICE, italian: ITALIAN_VOICES }, null, 2)
);
console.log(
	'wrote scripts/content.json, content.p2.json, content.p3.json, themes.json, voices.json'
);
