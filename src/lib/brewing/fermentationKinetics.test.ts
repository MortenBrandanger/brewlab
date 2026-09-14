import { describe, expect, it } from 'vitest';
import { simulateFermentation, type FermentationInput } from './fermentationKinetics';
import { simulateMash } from './mashKinetics';
import { getYeast } from './ingredients';
import { step } from './recipes';

/** An ordinary wort from an ordinary mash, so the yeast is the only variable. */
const spectrum = simulateMash({
	steps: [step('alpha', 66, 60), step('mashout', 76, 10)],
	thicknessLPerKg: 3,
	mashPh: 5.4,
	diastaticPowerLintner: 60
}).spectrum;

const ferment = (
	over: Partial<FermentationInput> & { yeastId?: string; tempC?: number; days?: number }
) => {
	const yeast = getYeast(over.yeastId ?? 'american-ale')!;
	return simulateFermentation({
		ogPoints: 52,
		spectrum,
		yeast,
		pitchRate: 'standard',
		steps: [{ tempC: over.tempC ?? yeast.tempIdealC, days: over.days ?? 14 }],
		coldCrash: true,
		...over
	});
};

describe('fermentation kinetics', () => {
	it('is deterministic', () => {
		expect(ferment({})).toEqual(ferment({}));
	});

	it('eats the glucose first and leaves the dextrins alone', () => {
		const k = ferment({});
		expect(k.remaining.glucose).toBeLessThan(0.5);
		expect(k.remaining.dextrins).toBeGreaterThan(0);
		// Two days in, the glucose is gone before the maltose is.
		const early = k.curve.find((p) => p.day >= 2)!;
		expect(early.points).toBeGreaterThan(k.curve.at(-1)!.points);
	});

	it('a strain that cannot take maltotriose leaves it behind', () => {
		const english = ferment({ yeastId: 'english-ale' });
		const saison = ferment({ yeastId: 'saison', days: 21 });
		expect(english.remaining.maltotriose).toBeGreaterThan(saison.remaining.maltotriose);
		expect(saison.apparent).toBeGreaterThan(english.apparent);
	});

	it('warmer makes more fruit and more heat', () => {
		const cool = ferment({ tempC: 16 });
		const warm = ferment({ tempC: 24 });
		expect(warm.esters).toBeGreaterThan(cool.esters);
		expect(warm.fusels).toBeGreaterThan(cool.fusels);
	});

	it('an underpitch grows more, and growing is where the flavour comes from', () => {
		const under = ferment({ pitchRate: 'under' });
		const over = ferment({ pitchRate: 'over' });
		expect(under.growthFactor).toBeGreaterThan(over.growthFactor);
		expect(under.esters).toBeGreaterThan(over.esters);
	});

	it('makes diacetyl while growing and takes it back while finishing', () => {
		const full = ferment({ days: 14 });
		const peak = Math.max(...full.curve.map((p) => p.diacetyl));
		expect(peak).toBeGreaterThan(full.diacetyl);
		const cut = ferment({ days: 3 });
		expect(cut.diacetyl).toBeGreaterThan(full.diacetyl);
	});

	it('a lager strain in the cold stops short', () => {
		const frozen = ferment({ yeastId: 'german-lager', tempC: 2, days: 14 });
		const proper = ferment({ yeastId: 'german-lager', tempC: 10, days: 28 });
		expect(frozen.apparent).toBeLessThan(proper.apparent);
		expect(frozen.stalled === 'cold' || frozen.stalled === 'time').toBe(true);
	});

	it('the curve only ever goes down, one point at a time', () => {
		const k = ferment({});
		for (let i = 1; i < k.curve.length; i++) {
			expect(k.curve[i].points).toBeLessThanOrEqual(k.curve[i - 1].points + 1e-9);
		}
		expect(k.curve[0].points).toBeCloseTo(52, 3);
	});
});
