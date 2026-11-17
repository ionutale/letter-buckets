import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('pwa client', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('notifies listeners when an update is waiting and tells it to take over', async () => {
		const updateListeners: (() => void)[] = [];
		let stateListener: (() => void) | undefined;
		const installing = {
			state: 'installing',
			addEventListener: (type: string, callback: () => void) => {
				if (type === 'statechange') stateListener = callback;
			}
		};
		const waiting = { postMessage: vi.fn() };
		const registration = {
			installing,
			waiting,
			addEventListener: (type: string, callback: () => void) => {
				if (type === 'updatefound') updateListeners.push(callback);
			}
		};
		const serviceWorker = {
			register: vi.fn().mockResolvedValue(registration),
			controller: {},
			addEventListener: vi.fn()
		};
		Object.defineProperty(navigator, 'serviceWorker', {
			configurable: true,
			value: serviceWorker
		});

		const client = await import('./client.js');
		const seen = vi.fn();
		client.onUpdateReady(seen);
		client.initPwa({ force: true });
		await Promise.resolve();
		await Promise.resolve();

		expect(serviceWorker.register).toHaveBeenCalledWith('/service-worker.js');
		updateListeners[0]();
		installing.state = 'installed';
		stateListener?.();
		expect(seen).toHaveBeenCalledTimes(1);

		client.applyUpdate();
		expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
	});

	it('does not arm a reload when no update was requested', async () => {
		let controllerChange: (() => void) | undefined;
		const registration = {
			installing: null,
			waiting: null,
			addEventListener: vi.fn()
		};
		const serviceWorker = {
			register: vi.fn().mockResolvedValue(registration),
			controller: {},
			addEventListener: (type: string, callback: () => void) => {
				if (type === 'controllerchange') controllerChange = callback;
			}
		};
		Object.defineProperty(navigator, 'serviceWorker', {
			configurable: true,
			value: serviceWorker
		});
		const reload = vi.fn();
		const realLocation = window.location;
		Object.defineProperty(window, 'location', {
			configurable: true,
			value: { ...realLocation, reload }
		});

		try {
			const client = await import('./client.js');
			client.initPwa({ force: true });
			await Promise.resolve();
			await Promise.resolve();

			client.applyUpdate();
			controllerChange?.();

			expect(reload).not.toHaveBeenCalled();
		} finally {
			Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
		}
	});
});
