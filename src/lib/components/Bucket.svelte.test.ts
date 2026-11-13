import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Bucket from './Bucket.svelte';

describe('Bucket', () => {
	it('labels a closed bucket by its word number', () => {
		render(Bucket, { index: 1, status: 'closed' });
		expect(screen.getByRole('button', { name: /open word 1/i })).toBeTruthy();
	});
	it('shows the word when done', () => {
		render(Bucket, { index: 2, status: 'done', word: 'CAT' });
		expect(screen.getByText('CAT')).toBeTruthy();
	});
});
