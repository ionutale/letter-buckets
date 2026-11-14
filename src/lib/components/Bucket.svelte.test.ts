import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Bucket from './Bucket.svelte';

describe('Bucket', () => {
	it('labels a closed bucket by its word number', () => {
		render(Bucket, { index: 1, status: 'closed' });
		expect(screen.getByRole('button', { name: /open word 1/i })).toBeTruthy();
	});
	it('shows the word and a check when done, and empties the bucket', () => {
		const { container } = render(Bucket, {
			index: 2,
			status: 'done',
			word: 'CAT',
			image: '/art/words/en/l01-w1.webp'
		});
		expect(screen.getByText('CAT')).toBeTruthy();
		expect(container.querySelector('.done-badge')).toBeTruthy();
		expect(container.querySelector('.clue')).toBeNull();
	});
	it('keeps the clue image on a closed bucket', () => {
		const { container } = render(Bucket, {
			index: 1,
			status: 'closed',
			image: '/art/words/en/l01-w1.webp'
		});
		expect(container.querySelector('.clue')).toBeTruthy();
		expect(container.querySelector('.done-badge')).toBeNull();
	});
	it('shows the clue again when the next word has its own image', async () => {
		const { container, rerender } = render(Bucket, {
			index: 1,
			status: 'closed',
			image: '/art/words/en/l01-w1.webp'
		});
		await fireEvent.error(container.querySelector('img.clue')!);
		expect(container.querySelector('.clue')).toBeNull();

		await rerender({ index: 1, status: 'closed', image: '/art/words/en/l02-w1.webp' });
		expect(container.querySelector('.clue')).toBeTruthy();
	});
});
