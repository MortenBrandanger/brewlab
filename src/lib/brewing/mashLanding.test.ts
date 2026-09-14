import { describe, expect, it } from 'vitest';
import { EXAMPLES, emptyRecipe, ferm } from './recipes';
import { computeMashProfile } from './calculations';
import { mashLanding, MISS_SIGMA_C } from './mashLanding';

describe('where the mash lands', () => {
	const recipes = EXAMPLES.map((e) => e.build());

	it('is the same place every time for the same recipe', () => {
		for (const r of recipes) {
			expect(mashLanding(r)).toEqual(mashLanding(structuredClone(r)));
		}
	});

	it('does not move when a hop or the yeast changes', () => {
		const r = recipes[0];
		const before = mashLanding(r)!.landedC;
		const hopped = { ...r, hops: [] };
		const reyeasted = { ...r, fermentation: { ...r.fermentation, yeastId: 'saison' } };
		expect(mashLanding(hopped)!.landedC).toBe(before);
		expect(mashLanding(reyeasted)!.landedC).toBe(before);
	});

	it('misses by a realistic amount and never leaves the enzymes behind', () => {
		let anyMiss = false;
		for (const r of recipes) {
			const l = mashLanding(r)!;
			expect(Math.abs(l.missC)).toBeLessThanOrEqual(2.3 * MISS_SIGMA_C + 0.25);
			expect(l.landedC).toBeGreaterThanOrEqual(58);
			expect(l.landedC).toBeLessThanOrEqual(74);
			if (Math.abs(l.missC) >= 0.5) anyMiss = true;
		}
		expect(anyMiss).toBe(true);
	});

	it('works out how much hot water lifts a cold mash back', () => {
		const r = emptyRecipe();
		r.fermentables = [ferm('pale-ale', 5)];
		const l = mashLanding(r)!;
		if (l.missC < 0) {
			expect(l.topUpL).toBeGreaterThan(0);
			expect(l.topUpL).toBeLessThan(4);
		} else {
			expect(l.topUpL).toBe(0);
		}
	});

	it('runs the first rest where it landed when the brewer lives with it', () => {
		const r = emptyRecipe();
		r.fermentables = [ferm('pale-ale', 5)];
		const aimed = computeMashProfile(r.mash);
		const kept = computeMashProfile({ ...r.mash, landedTempC: 63 });
		expect(kept.effectiveTempC).toBeLessThan(aimed.effectiveTempC);
		expect(kept.kinetics.attenuationLimit).toBeGreaterThan(aimed.kinetics.attenuationLimit);
	});
});
