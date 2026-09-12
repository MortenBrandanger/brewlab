import { describe, expect, test } from 'vitest';
import { decodeRecipe, encodeRecipe, shareUrl } from './share';
import { EXAMPLES, defaultRecipe } from '$lib/brewing/recipes';
import { simulate } from '$lib/brewing/simulate';

describe('shareable links', () => {
	test('a recipe survives a trip through a URL fragment', async () => {
		const recipe = defaultRecipe();
		const decoded = await decodeRecipe(await encodeRecipe(recipe));
		expect(decoded).toEqual(recipe);
	});

	test('every example round-trips to an identical simulation', async () => {
		for (const example of EXAMPLES) {
			const recipe = example.build();
			const decoded = await decodeRecipe(await encodeRecipe(recipe));
			expect(decoded, example.id).toBeDefined();
			expect(simulate(decoded!).metrics, example.id).toEqual(simulate(recipe).metrics);
		}
	});

	test('the fragment is URL safe and reasonably compact', async () => {
		const encoded = await encodeRecipe(EXAMPLES.find((e) => e.id === 'imperial-stout')!.build());
		expect(encoded).toMatch(/^r1:[zp][A-Za-z0-9_-]+$/);
		expect(encoded.length).toBeLessThan(2000);
	});

	test('compression actually shrinks the payload', async () => {
		const encoded = await encodeRecipe(EXAMPLES.find((e) => e.id === 'imperial-stout')!.build());
		const raw = JSON.stringify(EXAMPLES.find((e) => e.id === 'imperial-stout')!.build()).length;
		expect(encoded.length).toBeLessThan(raw);
	});

	test('a leading hash is accepted', async () => {
		const encoded = await encodeRecipe(defaultRecipe());
		await expect(decodeRecipe(`#${encoded}`)).resolves.toBeDefined();
	});

	test('anything that is not a BrewLab fragment returns undefined', async () => {
		await expect(decodeRecipe('')).resolves.toBeUndefined();
		await expect(decodeRecipe('#some-anchor')).resolves.toBeUndefined();
		await expect(decodeRecipe('r1:zdefinitely-not-deflate-data')).resolves.toBeUndefined();
	});

	test('the share URL keeps the recipe in the fragment, which is never sent to a server', async () => {
		const url = await shareUrl(defaultRecipe(), 'https://example.test', '/brew');
		expect(url.startsWith('https://example.test/brew#r1:')).toBe(true);
		expect(new URL(url).search).toBe('');
	});
});
