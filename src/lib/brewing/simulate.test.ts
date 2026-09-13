import { describe, expect, test } from 'vitest';
import { buildContext, simulate } from './simulate';
import { EXAMPLES, boilHop, defaultRecipe, emptyRecipe, ferm, fermStep, step } from './recipes';
import { SENSORY_KEYS } from './sensory';
import type { Recipe } from './types';

const base = (overrides: Partial<Recipe> = {}): Recipe => ({ ...defaultRecipe(), ...overrides });

describe('determinism', () => {
	test('the same recipe always gives the same result', () => {
		const recipe = defaultRecipe();
		const a = simulate(recipe);
		const b = simulate(structuredClone(recipe));
		expect(JSON.stringify(b)).toEqual(JSON.stringify(a));
	});

	test('every example is stable across repeated runs', () => {
		for (const example of EXAMPLES) {
			const recipe = example.build();
			expect(simulate(recipe).metrics).toEqual(simulate(recipe).metrics);
		}
	});
});

describe('safe edge cases', () => {
	const expectNoNonsense = (recipe: Recipe) => {
		const result = simulate(recipe);
		const numbers = [
			...Object.values(result.metrics),
			...Object.values(result.sensory),
			result.scores.overall,
			result.scores.technical.value,
			result.scores.coherence.value,
			result.scores.enjoyment.value,
			...result.ageCurve.map((p) => p.quality)
		];
		for (const value of numbers) {
			expect(Number.isFinite(value)).toBe(true);
		}
		return result;
	};

	test('an empty recipe returns clear validation rather than NaN', () => {
		const result = expectNoNonsense(emptyRecipe());
		expect(result.validation.length).toBeGreaterThan(0);
		expect(result.metrics.og).toBe(1);
		expect(result.metrics.abv).toBe(0);
	});

	test('zero volume is handled', () => {
		const result = expectNoNonsense(base({ batchVolumeL: 0, preBoilVolumeL: 0 }));
		expect(result.validation.some((v) => v.includes('Batch volume'))).toBe(true);
	});

	test('a missing yeast falls back and says so', () => {
		const result = expectNoNonsense(
			base({ fermentation: { ...defaultRecipe().fermentation, yeastId: 'not-a-yeast' } })
		);
		expect(result.validation.some((v) => v.toLowerCase().includes('yeast'))).toBe(true);
	});

	test('an empty grain bill is handled', () => {
		const result = expectNoNonsense(base({ fermentables: [] }));
		expect(result.validation.some((v) => v.includes('fermentables'))).toBe(true);
	});

	test('a pre-boil volume below the batch volume is corrected', () => {
		const result = expectNoNonsense(base({ batchVolumeL: 20, preBoilVolumeL: 5 }));
		expect(result.validation.some((v) => v.includes('Pre-boil'))).toBe(true);
	});

	test('absurd values do not produce infinity', () => {
		expectNoNonsense(
			base({
				batchVolumeL: 0.1,
				preBoilVolumeL: 9999,
				efficiencyPct: 999,
				boilTimeMin: 10000,
				fermentables: [ferm('pale-ale', 9999)],
				hops: [boilHop('columbus', 9999, 9999)],
				conditioning: { days: 99999, tempC: 99, co2Volumes: 99 }
			})
		);
	});

	test('negative and non-finite inputs are rejected rather than propagated', () => {
		expectNoNonsense(
			base({
				batchVolumeL: Number.NaN,
				preBoilVolumeL: -5,
				fermentables: [ferm('pale-ale', -3), ferm('crystal-light', Number.POSITIVE_INFINITY)],
				fermentation: { ...defaultRecipe().fermentation, steps: [fermStep('Primary', 19, -4)] }
			})
		);
	});

	test('no fermentation schedule falls back to a sensible one', () => {
		const result = expectNoNonsense(
			base({ fermentation: { ...defaultRecipe().fermentation, steps: [] } })
		);
		expect(result.validation.some((v) => v.includes('fermentation schedule'))).toBe(true);
	});
});

describe('result shape', () => {
	test('every sensory axis is present and inside 0–10', () => {
		const result = simulate(defaultRecipe());
		for (const key of SENSORY_KEYS) {
			expect(result.sensory[key]).toBeGreaterThanOrEqual(0);
			expect(result.sensory[key]).toBeLessThanOrEqual(10);
		}
	});

	test('scores sit inside 0–100 and the overall follows the documented weighting', () => {
		const result = simulate(defaultRecipe());
		const { technical, coherence, enjoyment, overall } = result.scores;
		for (const score of [technical, coherence, enjoyment]) {
			expect(score.value).toBeGreaterThanOrEqual(0);
			expect(score.value).toBeLessThanOrEqual(100);
		}
		expect(overall).toBe(
			Math.round(technical.value * 0.4 + coherence.value * 0.35 + enjoyment.value * 0.25)
		);
	});

	test('every score explains itself with contributions', () => {
		const result = simulate(defaultRecipe());
		for (const key of ['technical', 'coherence', 'enjoyment'] as const) {
			const score = result.scores[key];
			expect(score.positives.length + score.negatives.length).toBeGreaterThan(0);
			expect(score.positives.every((c) => c.delta > 0)).toBe(true);
			expect(score.negatives.every((c) => c.delta < 0)).toBe(true);
		}
	});

	test('the report names between three and six key decisions', () => {
		const result = simulate(defaultRecipe());
		expect(result.keyDecisions.length).toBeGreaterThanOrEqual(3);
		expect(result.keyDecisions.length).toBeLessThanOrEqual(6);
	});

	test('improvements are always offered, even for a good beer', () => {
		const result = simulate(defaultRecipe());
		expect(result.improvements.length).toBeGreaterThan(0);
	});

	test('the age curve starts at packaging and runs to a year', () => {
		const curve = simulate(defaultRecipe()).ageCurve;
		expect(curve[0].week).toBe(0);
		expect(curve.at(-1)!.week).toBe(52);
	});
});

describe('calibration against canonical recipes', () => {
	const expectations: Record<
		string,
		{
			og: [number, number];
			abv: [number, number];
			ibu: [number, number];
			ebc: [number, number];
			overall: number;
		}
	> = {
		'house-pale-ale': {
			og: [1.05, 1.062],
			abv: [5, 6.4],
			ibu: [25, 40],
			ebc: [8, 18],
			overall: 82
		},
		'west-coast-ipa': {
			og: [1.06, 1.075],
			abv: [6.5, 8],
			ibu: [38, 60],
			ebc: [8, 20],
			overall: 80
		},
		'czech-lager': {
			og: [1.046, 1.058],
			abv: [4.6, 5.8],
			ibu: [28, 45],
			ebc: [6, 13],
			overall: 80
		},
		'dry-stout': { og: [1.038, 1.05], abv: [3.8, 5], ibu: [28, 45], ebc: [45, 85], overall: 78 },
		saison: { og: [1.05, 1.066], abv: [6, 7.8], ibu: [15, 32], ebc: [5, 14], overall: 80 },
		'imperial-stout': {
			og: [1.072, 1.095],
			abv: [7.5, 9.5],
			ibu: [45, 70],
			ebc: [60, 120],
			overall: 78
		}
	};

	test('canonical recipes land in their expected ranges and score well', () => {
		for (const [id, expected] of Object.entries(expectations)) {
			const example = EXAMPLES.find((e) => e.id === id)!;
			const result = simulate(example.build());
			const m = result.metrics;
			expect(m.og, `${id} OG`).toBeGreaterThanOrEqual(expected.og[0]);
			expect(m.og, `${id} OG`).toBeLessThanOrEqual(expected.og[1]);
			expect(m.abv, `${id} ABV`).toBeGreaterThanOrEqual(expected.abv[0]);
			expect(m.abv, `${id} ABV`).toBeLessThanOrEqual(expected.abv[1]);
			expect(m.ibu, `${id} IBU`).toBeGreaterThanOrEqual(expected.ibu[0]);
			expect(m.ibu, `${id} IBU`).toBeLessThanOrEqual(expected.ibu[1]);
			expect(m.ebc, `${id} EBC`).toBeGreaterThanOrEqual(expected.ebc[0]);
			expect(m.ebc, `${id} EBC`).toBeLessThanOrEqual(expected.ebc[1]);
			expect(result.scores.overall, `${id} overall`).toBeGreaterThanOrEqual(expected.overall);
		}
	});

	test('every canonical recipe lands inside the normal mash pH window', () => {
		for (const id of Object.keys(expectations)) {
			const result = simulate(EXAMPLES.find((e) => e.id === id)!.build());
			expect(result.metrics.mashPh, `${id} pH`).toBeGreaterThan(5.1);
			expect(result.metrics.mashPh, `${id} pH`).toBeLessThan(5.8);
		}
	});

	test('the deliberately flawed recipe scores badly and explains why', () => {
		const result = simulate(EXAMPLES.find((e) => e.id === 'flawed-brown')!.build());
		expect(result.scores.overall).toBeLessThan(45);
		expect(
			result.findings.filter((f) => f.severity === 'warning' || f.severity === 'severe').length
		).toBeGreaterThan(4);
		expect(result.improvements.length).toBeGreaterThanOrEqual(4);
	});

	test('the cloying rescue recipe is recognised as cloying', () => {
		const result = simulate(EXAMPLES.find((e) => e.id === 'oversweet-stout')!.build());
		expect(result.sensory.sweetness).toBeGreaterThan(6.5);
		expect(result.findings.map((f) => f.code)).toContain('CLOYING');
	});

	test('an imperial stout gains from maturation while a hoppy beer loses', () => {
		const stout = simulate(EXAMPLES.find((e) => e.id === 'imperial-stout')!.build()).ageCurve;
		const ipa = simulate(EXAMPLES.find((e) => e.id === 'west-coast-ipa')!.build()).ageCurve;
		expect(stout.at(-1)!.quality).toBeGreaterThan(stout[0].quality);
		expect(ipa.at(-1)!.quality).toBeLessThan(ipa[0].quality);
	});

	test('a hot-fermented IPA is clearly worse than the same beer fermented cool', () => {
		const recipe = EXAMPLES.find((e) => e.id === 'west-coast-ipa')!.build();
		const cool = simulate(recipe);
		const hot = simulate({
			...recipe,
			chill: { ...recipe.chill, pitchTempC: 28 },
			fermentation: { ...recipe.fermentation, steps: [fermStep('Primary', 28, 13)] }
		});
		expect(hot.scores.overall).toBeLessThan(cool.scores.overall - 15);
		expect(hot.sensory.alcoholWarmth).toBeGreaterThan(cool.sensory.alcoholWarmth);
		expect(hot.findings.map((f) => f.code)).toContain('FUSEL_RISK');
	});

	test('mashing the same recipe at 64 and 70 degrees gives visibly different beers', () => {
		const cool = simulate(base({ mash: { steps: [step('beta', 64, 60)], thicknessLPerKg: 3 } }));
		const hot = simulate(base({ mash: { steps: [step('alpha', 70, 60)], thicknessLPerKg: 3 } }));
		expect(hot.metrics.fg - cool.metrics.fg).toBeGreaterThan(0.004);
		expect(cool.metrics.abv).toBeGreaterThan(hot.metrics.abv);
		expect(hot.sensory.body - cool.sensory.body).toBeGreaterThan(0.5);
	});
});

describe('a brew day in progress', () => {
	/*
	 * A new brew has no yeast, because choosing one is stage seven's decision.
	 * buildContext used to bail out without a strain, which silently blanked
	 * every derived figure on the first six stages -- mash water, grain
	 * absorption, the run-off breakdown, the water panel -- exactly when the
	 * brewer is reading them.
	 */
	test('has every pre-fermentation figure before a yeast is chosen', () => {
		const recipe = emptyRecipe();
		recipe.water.profileId = 'balanced';
		recipe.fermentables = [ferm('pale-ale', 4.4), ferm('munich-light', 0.4)];
		expect(recipe.fermentation.yeastId).toBe('');

		const ctx = buildContext(recipe);
		expect(ctx).toBeDefined();
		expect(ctx!.gravity.grist.grainKg).toBeCloseTo(4.8, 2);
		expect(ctx!.water.mashPh).toBeGreaterThan(4.5);
		expect(ctx!.totalWaterL).toBeGreaterThan(recipe.preBoilVolumeL);
	});
});
