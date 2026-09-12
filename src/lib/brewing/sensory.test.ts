import { describe, expect, test } from 'vitest';
import { computeHopLoad, gristFlavour, hopFadeFactor } from './sensory';
import { simulate } from './simulate';
import { boilHop, defaultRecipe, dryHop, ferm, fermStep, step, whirlpoolHop } from './recipes';
import type { Recipe } from './types';

const base = (overrides: Partial<Recipe> = {}): Recipe => ({ ...defaultRecipe(), ...overrides });

describe('grist flavour', () => {
	test('roasted malt is far more potent per percent than base malt', () => {
		const roasty = gristFlavour(
			base({ fermentables: [ferm('pale-ale', 4.75), ferm('chocolate', 0.25)] })
		);
		expect(roasty.vector.roast).toBeGreaterThan(3.5);
	});

	test('crystal malt adds caramel and sweetness together', () => {
		const plain = gristFlavour(base({ fermentables: [ferm('pale-ale', 5)] }));
		const crystal = gristFlavour(
			base({ fermentables: [ferm('pale-ale', 4.4), ferm('crystal-medium', 0.6)] })
		);
		expect(crystal.vector.caramel).toBeGreaterThan(plain.vector.caramel + 2);
		expect(crystal.vector.sweetness).toBeGreaterThan(plain.vector.sweetness);
	});

	test('lactose sweetens without being fermented away', () => {
		const withLactose = simulate(
			base({ fermentables: [ferm('pale-ale', 4.5), ferm('lactose', 0.5)] })
		);
		const without = simulate(base({ fermentables: [ferm('pale-ale', 5)] }));
		expect(withLactose.metrics.fg).toBeGreaterThan(without.metrics.fg + 0.004);
		expect(withLactose.sensory.sweetness).toBeGreaterThan(without.sensory.sweetness);
	});
});

describe('hop load', () => {
	test('dry hops dominate aroma, bittering hops do not', () => {
		const bittering = computeHopLoad(base({ hops: [boilHop('citra', 60, 60)] }));
		const dry = computeHopLoad(base({ hops: [dryHop('citra', 60, 3, 5)] }));
		expect(dry.aromaUnits).toBeGreaterThan(bittering.aromaUnits * 5);
	});

	test('aroma extraction saturates with dry hop contact time', () => {
		const short = computeHopLoad(base({ hops: [dryHop('citra', 60, 1, 5)] }));
		const medium = computeHopLoad(base({ hops: [dryHop('citra', 60, 3, 5)] }));
		const long = computeHopLoad(base({ hops: [dryHop('citra', 60, 10, 5)] }));
		expect(medium.aromaUnits).toBeGreaterThan(short.aromaUnits);
		expect(long.aromaUnits - medium.aromaUnits).toBeLessThan(medium.aromaUnits - short.aromaUnits);
	});

	test('a cooler whirlpool keeps more aroma', () => {
		const hot = computeHopLoad(base({ hops: [whirlpoolHop('citra', 60, 20, 98)] }));
		const cool = computeHopLoad(base({ hops: [whirlpoolHop('citra', 60, 20, 75)] }));
		expect(cool.aromaUnits).toBeGreaterThan(hot.aromaUnits);
	});

	test('descriptors come from the hops that actually contribute aroma', () => {
		const load = computeHopLoad(base({ hops: [dryHop('citra', 80, 3, 5)] }));
		expect(load.descriptors).toContain('citrus');
		expect(load.descriptors).toContain('tropical');
	});

	test('dry hopping into active fermentation is modelled as scrubbed but fruity', () => {
		const duringFermentation = simulate(base({ hops: [dryHop('citra', 80, 3, 2)] }));
		const after = simulate(base({ hops: [dryHop('citra', 80, 3, 8)] }));
		expect(duringFermentation.sensory.hopAroma).toBeLessThan(after.sensory.hopAroma);
		expect(duringFermentation.sensory.fruitEsters).toBeGreaterThan(after.sensory.fruitEsters);
	});
});

describe('hop aroma over time', () => {
	test('aroma fades, and faster when warm', () => {
		expect(hopFadeFactor(0, 4)).toBe(1);
		expect(hopFadeFactor(60, 4)).toBeLessThan(1);
		expect(hopFadeFactor(60, 20)).toBeLessThan(hopFadeFactor(60, 4));
	});

	test('long conditioning costs a hoppy beer its aroma', () => {
		const fresh = simulate(base({ conditioning: { days: 7, tempC: 4, co2Volumes: 2.4 } }));
		const aged = simulate(base({ conditioning: { days: 120, tempC: 18, co2Volumes: 2.4 } }));
		expect(aged.sensory.hopAroma).toBeLessThan(fresh.sensory.hopAroma * 0.7);
	});
});

describe('fermentation character', () => {
	test('warmer fermentation raises esters', () => {
		const cool = simulate(
			base({
				fermentation: { ...defaultRecipe().fermentation, steps: [fermStep('Primary', 17, 14)] }
			})
		);
		const warm = simulate(
			base({
				fermentation: { ...defaultRecipe().fermentation, steps: [fermStep('Primary', 23, 14)] }
			})
		);
		expect(warm.sensory.fruitEsters).toBeGreaterThan(cool.sensory.fruitEsters);
	});

	test('a hefeweizen strain produces both banana and clove', () => {
		const result = simulate(
			base({
				fermentation: {
					yeastId: 'hefeweizen',
					pitchRate: 'standard',
					steps: [fermStep('Primary', 19, 14)],
					coldCrash: false
				}
			})
		);
		expect(result.sensory.fruitEsters).toBeGreaterThan(4);
		expect(result.sensory.phenols).toBeGreaterThan(4);
	});

	test('mash temperature visibly changes body and sweetness', () => {
		const dry = simulate(base({ mash: { steps: [step('beta', 64, 60)], thicknessLPerKg: 3 } }));
		const full = simulate(base({ mash: { steps: [step('alpha', 70, 60)], thicknessLPerKg: 3 } }));
		expect(full.metrics.fg).toBeGreaterThan(dry.metrics.fg + 0.004);
		expect(full.sensory.body).toBeGreaterThan(dry.sensory.body);
		expect(dry.sensory.crispness).toBeGreaterThan(full.sensory.crispness);
	});

	test('sulfate sharpens bitterness, chloride rounds the body', () => {
		const sulfate = simulate(
			base({
				water: { profileId: 'hop-forward', salts: defaultRecipe().water.salts, lacticAcidMl: 4 }
			})
		);
		const chloride = simulate(
			base({
				water: { profileId: 'malt-forward', salts: defaultRecipe().water.salts, lacticAcidMl: 4 }
			})
		);
		expect(sulfate.sensory.bitterness).toBeGreaterThan(chloride.sensory.bitterness);
		expect(chloride.sensory.body).toBeGreaterThan(sulfate.sensory.body);
	});
});
