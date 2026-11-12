import { vi } from 'vitest';

if (typeof window !== 'undefined') {
	if (!window.matchMedia) {
		Object.defineProperty(window, 'matchMedia', {
			configurable: true,
			value: (query: string) => ({
				matches: false,
				media: query,
				onchange: null,
				addListener: () => {},
				removeListener: () => {},
				addEventListener: () => {},
				removeEventListener: () => {},
				dispatchEvent: () => false
			})
		});
	}

	const store = new Map<string, string>();
	const fallback = {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => void store.set(key, value),
		removeItem: (key: string) => void store.delete(key),
		clear: () => store.clear(),
		key: (index: number) => [...store.keys()][index] ?? null,
		get length() {
			return store.size;
		}
	};

	try {
		if (!window.localStorage) throw new Error('missing');
	} catch {
		Object.defineProperty(window, 'localStorage', { configurable: true, value: fallback });
	}

	if (typeof HTMLMediaElement !== 'undefined') {
		Object.defineProperty(HTMLMediaElement.prototype, 'play', {
			configurable: true,
			value: vi.fn().mockResolvedValue(undefined)
		});
		Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
			configurable: true,
			value: vi.fn()
		});
	}
}
