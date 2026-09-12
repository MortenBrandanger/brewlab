import { describe, expect, test } from 'vitest';
import {
	SCHEMA_VERSION,
	exportJson,
	importJson,
	listRecipes,
	loadAutosave,
	loadProgress,
	migrateStored,
	normaliseRecipe,
	wrap
} from './recipes';
import { EXAMPLES, defaultRecipe } from '$lib/brewing/recipes';
import { simulate } from '$lib/brewing/simulate';

describe('JSON round-trip', () => {
	test('a recipe survives export and import unchanged', () => {
		const stored = wrap(defaultRecipe());
		const result = importJson(exportJson(stored));
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.stored.recipe).toEqual(stored.recipe);
		expect(result.stored.id).toBe(stored.id);
	});

	test('every example round-trips to an identical simulation', () => {
		for (const example of EXAMPLES) {
			const stored = wrap(example.build());
			const result = importJson(exportJson(stored));
			expect(result.ok, example.id).toBe(true);
			if (!result.ok) continue;
			expect(simulate(result.stored.recipe).metrics, example.id).toEqual(
				simulate(stored.recipe).metrics
			);
		}
	});

	test('malformed JSON is reported rather than thrown', () => {
		const result = importJson('{ not json');
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error).toContain('valid JSON');
	});

	test('valid JSON that is not a recipe is rejected', () => {
		const result = importJson(JSON.stringify({ hello: 'world' }));
		expect(result.ok).toBe(false);
	});
});

describe('schema migration', () => {
	test('a bare recipe with no schema version is accepted', () => {
		const bare = { ...defaultRecipe() };
		const stored = migrateStored(bare);
		expect(stored.schemaVersion).toBe(SCHEMA_VERSION);
		expect(stored.recipe.fermentables.length).toBe(bare.fermentables.length);
		expect(stored.id).toBeTruthy();
		expect(stored.createdAt).toBeTruthy();
	});

	test('a file written by a newer build is read as far as it can be', () => {
		const future = { ...wrap(defaultRecipe()), schemaVersion: 99, unknownField: true };
		const stored = migrateStored(future);
		expect(stored.schemaVersion).toBe(SCHEMA_VERSION);
		expect(stored.recipe.fermentables.length).toBeGreaterThan(0);
	});

	test('missing sections are filled in with defaults', () => {
		const partial = {
			recipe: { name: 'Half a recipe', fermentables: [{ fermentableId: 'pale-ale', weightKg: 4 }] }
		};
		const stored = migrateStored(partial);
		expect(stored.recipe.name).toBe('Half a recipe');
		expect(stored.recipe.mash.steps.length).toBeGreaterThan(0);
		expect(stored.recipe.fermentation.steps.length).toBeGreaterThan(0);
		expect(stored.recipe.water.salts.gypsum).toBe(0);
		expect(stored.recipe.fermentables[0].id).toBeTruthy();
	});

	test('nonsense values are replaced rather than propagated', () => {
		const nonsense = {
			recipe: {
				batchVolumeL: 'twenty',
				preBoilVolumeL: null,
				fermentables: [{ fermentableId: 'pale-ale', weightKg: 'lots' }, 'not an object'],
				hops: [{ hopId: '', grams: 10 }],
				conditioning: { days: Number.NaN }
			}
		};
		const recipe = migrateStored(nonsense).recipe;
		expect(Number.isFinite(recipe.batchVolumeL)).toBe(true);
		expect(recipe.fermentables).toHaveLength(1);
		expect(recipe.fermentables[0].weightKg).toBe(0);
		expect(recipe.hops).toHaveLength(0);
		expect(Number.isFinite(recipe.conditioning.days)).toBe(true);
	});

	test('normalising twice changes nothing the second time', () => {
		const once = normaliseRecipe(defaultRecipe());
		const twice = normaliseRecipe(structuredClone(once));
		expect(twice).toEqual(once);
	});
});

describe('without IndexedDB', () => {
	test('reads degrade to empty instead of throwing', async () => {
		await expect(listRecipes()).resolves.toEqual([]);
		await expect(loadAutosave()).resolves.toBeUndefined();
		await expect(loadProgress()).resolves.toEqual({});
	});
});

describe('resuming a session', () => {
	test('a legacy bare-recipe autosave with a real grist counts as brewed', () => {
		const legacy = migrateStored(defaultRecipe());
		expect(legacy.recipe.fermentables.length).toBeGreaterThan(0);
	});

	test('a legacy autosave with nothing in it is not treated as a finished beer', () => {
		const empty = migrateStored({ name: 'Untouched', fermentables: [], hops: [] });
		expect(empty.recipe.fermentables).toHaveLength(0);
	});
});
