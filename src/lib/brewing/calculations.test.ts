import { describe, expect, test } from 'vitest';
import {
	POINTS_PER_KG_PER_L,
	computeGravity,
	computeGrist,
	computeIbu,
	computeMashProfile,
	moreySrm,
	pointsToSg,
	saturate,
	sgToPoints,
	strikeTempC,
	tinsethBigness,
	tinsethTimeFactor
} from './calculations';
import { boilHop, defaultRecipe, dryHop, ferm, step, whirlpoolHop } from './recipes';
import type { Recipe } from './types';

const base = (overrides: Partial<Recipe> = {}): Recipe => ({ ...defaultRecipe(), ...overrides });

describe('gravity and efficiency', () => {
	test('gravity follows potential, weight, volume and efficiency', () => {
		const recipe = base({
			fermentables: [ferm('pale-ale', 5)],
			batchVolumeL: 20,
			preBoilVolumeL: 24,
			efficiencyPct: 75,
			mash: { steps: [step('alpha', 66, 60)], thicknessLPerKg: 3 }
		});
		const mash = computeMashProfile(recipe.mash);
		const { og } = computeGravity(recipe, mash);
		// 0.80 potential × 5 kg × 386 / 20 L × 0.75 efficiency ≈ 58 points.
		const expected = (0.8 * 5 * POINTS_PER_KG_PER_L * 0.75) / 20;
		expect(sgToPoints(og)).toBeCloseTo(expected, 0);
	});

	test('halving the volume roughly doubles the gravity points', () => {
		const small = base({
			fermentables: [ferm('pale-ale', 4)],
			batchVolumeL: 10,
			preBoilVolumeL: 13
		});
		const large = base({
			fermentables: [ferm('pale-ale', 4)],
			batchVolumeL: 20,
			preBoilVolumeL: 24
		});
		const mash = computeMashProfile(small.mash);
		const smallPoints = sgToPoints(computeGravity(small, mash).og);
		const largePoints = sgToPoints(computeGravity(large, mash).og);
		expect(smallPoints / largePoints).toBeGreaterThan(1.7);
	});

	test('sugar ignores brewhouse efficiency', () => {
		const recipe = base({
			fermentables: [ferm('brewing-sugar', 1)],
			efficiencyPct: 50,
			batchVolumeL: 20
		});
		const grist = computeGrist(recipe, 0.5, 20);
		expect(grist.entries[0].points).toBeCloseTo((1 * POINTS_PER_KG_PER_L) / 20, 1);
	});

	test('efficiency drops as the grain bill grows', () => {
		const normal = base({ fermentables: [ferm('pale-ale', 4.5)] });
		const huge = base({ fermentables: [ferm('pale-ale', 12)] });
		const mash = computeMashProfile(normal.mash);
		expect(computeGravity(huge, mash).effectiveEfficiency).toBeLessThan(
			computeGravity(normal, mash).effectiveEfficiency
		);
	});

	test('a grist without enough diastatic malt loses efficiency', () => {
		const poor = base({ fermentables: [ferm('pale-ale', 1), ferm('flaked-oats', 3)] });
		const good = base({ fermentables: [ferm('pale-ale', 4)] });
		const mash = computeMashProfile(poor.mash);
		expect(computeGravity(poor, mash).effectiveEfficiency).toBeLessThan(
			computeGravity(good, mash).effectiveEfficiency
		);
	});

	test('gravity conversions round-trip', () => {
		expect(pointsToSg(sgToPoints(1.0567))).toBeCloseTo(1.0567, 6);
	});
});

describe('colour', () => {
	test('Morey returns a plausible SRM for a pale grist', () => {
		const recipe = base({ fermentables: [ferm('pale-ale', 5)], batchVolumeL: 20 });
		const grist = computeGrist(recipe, 0.72, 20);
		const srm = moreySrm(grist.colourMcu);
		expect(srm).toBeGreaterThan(3);
		expect(srm).toBeLessThan(8);
	});

	test('roasted malt darkens the beer sharply', () => {
		const pale = computeGrist(base({ fermentables: [ferm('pale-ale', 5)] }), 0.72, 20);
		const dark = computeGrist(
			base({ fermentables: [ferm('pale-ale', 4.5), ferm('roasted-barley', 0.5)] }),
			0.72,
			20
		);
		expect(moreySrm(dark.colourMcu)).toBeGreaterThan(moreySrm(pale.colourMcu) * 3);
	});

	test('colour of an empty grist is zero, not NaN', () => {
		expect(moreySrm(0)).toBe(0);
	});
});

describe('mash profile', () => {
	test('a cool mash is more fermentable than a hot one', () => {
		const cool = computeMashProfile({ steps: [step('beta', 62, 60)], thicknessLPerKg: 3 });
		const hot = computeMashProfile({ steps: [step('alpha', 70, 60)], thicknessLPerKg: 3 });
		expect(cool.fermentabilityFactor).toBeGreaterThan(hot.fermentabilityFactor);
		expect(hot.bodyFactor).toBeGreaterThan(cool.bodyFactor);
	});

	test('a step mash with a beta rest beats a single infusion at the same average', () => {
		const single = computeMashProfile({ steps: [step('alpha', 67, 60)], thicknessLPerKg: 3 });
		const stepped = computeMashProfile({
			steps: [step('beta', 63, 30), step('alpha', 71, 30)],
			thicknessLPerKg: 3
		});
		expect(stepped.effectiveTempC).toBeCloseTo(single.effectiveTempC, 0);
		expect(stepped.fermentabilityFactor).toBeGreaterThan(single.fermentabilityFactor);
	});

	test('a short mash costs efficiency', () => {
		const short = computeMashProfile({ steps: [step('alpha', 66, 20)], thicknessLPerKg: 3 });
		const full = computeMashProfile({ steps: [step('alpha', 66, 60)], thicknessLPerKg: 3 });
		expect(short.efficiencyFactor).toBeLessThan(full.efficiencyFactor);
	});

	test('no step in the conversion range means almost nothing converts', () => {
		const none = computeMashProfile({ steps: [step('protein', 50, 60)], thicknessLPerKg: 3 });
		expect(none.conversionMinutes).toBe(0);
		expect(none.efficiencyFactor).toBeLessThan(0.5);
	});

	test('a protein rest reduces body and foam', () => {
		const withRest = computeMashProfile({
			steps: [step('protein', 52, 20), step('alpha', 66, 60)],
			thicknessLPerKg: 3
		});
		const without = computeMashProfile({ steps: [step('alpha', 66, 60)], thicknessLPerKg: 3 });
		expect(withRest.foamFactor).toBeLessThan(without.foamFactor);
		expect(withRest.bodyFactor).toBeLessThan(without.bodyFactor);
	});

	test('a ferulic rest below 46 °C is not treated as a protein rest', () => {
		const ferulic = computeMashProfile({
			steps: [step('acid', 44, 15), step('alpha', 66, 60)],
			thicknessLPerKg: 3
		});
		expect(ferulic.hasProteinRest).toBe(false);
	});
});

describe('bitterness', () => {
	test('Tinseth matches the published worked example', () => {
		// 30 g of 12% alpha at 60 minutes in 20 L at 1.055 boil gravity ≈ 40 IBU.
		const recipe = base({
			batchVolumeL: 20,
			hops: [boilHop('citra', 30, 60)],
			fermentables: [ferm('pale-ale', 5)]
		});
		const { total } = computeIbu(recipe, 1.055);
		expect(total).toBeGreaterThan(36);
		expect(total).toBeLessThan(44);
	});

	test('bigness factor falls as boil gravity rises', () => {
		expect(tinsethBigness(1.04)).toBeGreaterThan(tinsethBigness(1.09));
	});

	test('utilisation rises with time and flattens out', () => {
		const early = tinsethTimeFactor(15);
		const mid = tinsethTimeFactor(60);
		const late = tinsethTimeFactor(90);
		expect(mid).toBeGreaterThan(early);
		expect(late - mid).toBeLessThan(mid - early);
	});

	test('the same hop gives far less bitterness late in the boil', () => {
		const recipe = base({ hops: [boilHop('cascade', 30, 60)] });
		const late = base({ hops: [boilHop('cascade', 30, 5)] });
		expect(computeIbu(late, 1.05).total).toBeLessThan(computeIbu(recipe, 1.05).total * 0.3);
	});

	test('whirlpool additions contribute some but not full bitterness', () => {
		const whirlpool = base({ hops: [whirlpoolHop('cascade', 30, 20, 80)] });
		const boil = base({ hops: [boilHop('cascade', 30, 20)] });
		const wpIbu = computeIbu(whirlpool, 1.05).total;
		expect(wpIbu).toBeGreaterThan(0);
		expect(wpIbu).toBeLessThan(computeIbu(boil, 1.05).total);
	});

	test('a cooler whirlpool isomerises less', () => {
		const hot = base({ hops: [whirlpoolHop('cascade', 40, 20, 95)] });
		const cool = base({ hops: [whirlpoolHop('cascade', 40, 20, 70)] });
		expect(computeIbu(cool, 1.05).total).toBeLessThan(computeIbu(hot, 1.05).total);
	});

	test('dry hops add no calculated IBU', () => {
		const recipe = base({ hops: [dryHop('citra', 200, 5, 5)] });
		expect(computeIbu(recipe, 1.05).total).toBe(0);
	});
});

describe('strike temperature', () => {
	test('a 66 degree mash at 3 L/kg needs water near 72 degrees', () => {
		expect(strikeTempC(66, 3)).toBeGreaterThan(71);
		expect(strikeTempC(66, 3)).toBeLessThan(73);
	});

	test('a thicker mash needs a bigger head start', () => {
		expect(strikeTempC(66, 2)).toBeGreaterThan(strikeTempC(66, 4));
	});

	test('strike temperature is always above the target', () => {
		for (const target of [50, 62, 66, 72]) {
			expect(strikeTempC(target, 3)).toBeGreaterThan(target);
		}
	});
});

describe('saturation helper', () => {
	test('never exceeds its ceiling', () => {
		expect(saturate(1e9, 5, 10)).toBeLessThanOrEqual(10);
		expect(saturate(0, 5, 10)).toBe(0);
		expect(saturate(-4, 5, 10)).toBe(0);
	});
});
