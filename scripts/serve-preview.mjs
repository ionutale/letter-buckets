import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve('build');
const port = Number(process.env.PORT ?? 4173);

const TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.webmanifest': 'application/manifest+json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.mp3': 'audio/mpeg',
	'.woff2': 'font/woff2',
	'.woff': 'font/woff',
	'.ico': 'image/x-icon',
	'.txt': 'text/plain; charset=utf-8'
};

async function send(file, response) {
	const body = await readFile(file);
	response.writeHead(200, {
		'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
		'cache-control': 'no-store'
	});
	response.end(body);
}

createServer(async (request, response) => {
	const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
	const pathname = decodeURIComponent(url.pathname);
	const candidate = join(root, normalize(pathname));

	if (!candidate.startsWith(root)) {
		response.writeHead(403).end('Forbidden');
		return;
	}

	try {
		const info = await stat(candidate);
		if (info.isFile()) {
			await send(candidate, response);
			return;
		}
	} catch {
		// Fall through to the SPA shell.
	}

	try {
		await send(join(root, '200.html'), response);
	} catch {
		response.writeHead(404).end('Not found');
	}
}).listen(port, '127.0.0.1', () => {
	console.log(`Letter Buckets preview on http://127.0.0.1:${port}`);
});
