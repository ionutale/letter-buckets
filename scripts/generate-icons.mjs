import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const svg = readFileSync(new URL('../static/favicon.svg', import.meta.url), 'utf8');
mkdirSync(new URL('../static/icons', import.meta.url), { recursive: true });

const outputs = [
	['icon-192.png', 192],
	['icon-512.png', 512],
	['icon-maskable-512.png', 512],
	['apple-touch-icon.png', 180]
];

for (const [name, size] of outputs) {
	const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
	writeFileSync(new URL(`../static/icons/${name}`, import.meta.url), png);
	console.log(`wrote static/icons/${name}`);
}
