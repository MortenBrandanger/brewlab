import { describe, expect, it } from 'vitest';
import { analyseVariance } from './variance';
import { EXAMPLES } from './recipes';

const recipes = EXAMPLES.slice(0, 4).map((e) => e.build());

describe('variance', () => {
	it('gives the same spread for the same recipe every time', () => {
		for (const r of recipes) expect(analyseVariance(r, 80)).toEqual(analyseVariance(r, 80));
	});

	it('the recipe as written sits inside its own nine-in-ten range', () => {
		for (const r of recipes) {
			const v = analyseVariance(r, 120);
			expect(v.abv.nominal).toBeGreaterThanOrEqual(v.abv.low - 0.05);
			expect(v.abv.nominal).toBeLessThanOrEqual(v.abv.high + 0.05);
			expect(v.abv.low).toBeLessThanOrEqual(v.abv.high);
		}
	});

	it('decomposes the spread into shares that add up', () => {
		const v = analyseVariance(recipes[0], 120);
		const total = v.sensitivity.reduce((s, x) => s + x.weight, 0);
		expect(total).toBeCloseTo(1, 6);
		for (let i = 1; i < v.sensitivity.length; i++) {
			expect(v.sensitivity[i].weight).toBeLessThanOrEqual(v.sensitivity[i - 1].weight);
		}
	});

	it('two different beers do not share a spread', () => {
		const a = analyseVariance(recipes[0], 80);
		const b = analyseVariance(recipes[1], 80);
		expect(a.abv).not.toEqual(b.abv);
	});

	it('keeps fragility on its scale', () => {
		for (const r of recipes) {
			const f = analyseVariance(r, 80).fragility;
			expect(f).toBeGreaterThanOrEqual(0);
			expect(f).toBeLessThanOrEqual(10);
		}
	});

	it('a mash the brewer lived with still varies batch to batch', () => {
		const r = recipes[0];
		const lived = { ...r, mash: { ...r.mash, landedTempC: 64.5 } };
		const v = analyseVariance(lived, 120);
		expect(v.abv.high - v.abv.low).toBeGreaterThan(0);
		expect(v.sensitivity.find((s) => s.source === 'mashTemp')!.weight).toBeGreaterThan(0);
	});
});
