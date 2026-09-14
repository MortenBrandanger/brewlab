import { describe, expect, it } from 'vitest';
import { EXAMPLES, emptyRecipe, ferm } from './recipes';
import { buildContext, simulate } from './simulate';
import { hazeFor } from './appearance';

describe('vorlauf', () => {
	it('is assumed, so the catalogue does not change', () => {
		for (const ex of EXAMPLES) {
			const r = ex.build();
			expect(simulate({ ...r, mash: { ...r.mash, vorlauf: true } }).scores.overall).toBe(
				simulate(r).scores.overall
			);
		}
	});

	it('skipping it leaves haze and a drying grip behind', () => {
		const r = emptyRecipe();
		r.fermentables = [ferm('pale-ale', 5)];
		r.fermentation.yeastId = 'american-ale';
		const skipped = { ...r, mash: { ...r.mash, vorlauf: false } };
		expect(hazeFor(skipped)).toBeGreaterThan(hazeFor(r) + 0.1);
		expect(buildContext(skipped)!.risks.astringency).toBeGreaterThan(
			buildContext(r)!.risks.astringency
		);
	});
});
