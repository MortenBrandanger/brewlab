import { describe, expect, it } from 'vitest';
import { simulateMash, type MashKineticsInput } from './mashKinetics';
import { step } from './recipes';

/**
 * Layer one on its own. The fifteen canonical recipes in simulate.test.ts
 * exercise it end to end, but a regression there reads as "the pale ale's
 * OG moved", not as "beta-amylase stopped dying". These say the mechanism.
 */
const mash = (
	steps: { tempC: number; minutes: number }[],
	extra: Partial<MashKineticsInput> = {}
) =>
	simulateMash({
		steps: steps.map((s) => step('alpha', s.tempC, s.minutes)),
		thicknessLPerKg: 3,
		mashPh: 5.4,
		diastaticPowerLintner: 60,
		...extra
	});

const fermentable = (k: ReturnType<typeof simulateMash>) => k.attenuationLimit;

describe('mash kinetics', () => {
	it('lands on the published calibration points', () => {
		expect(fermentable(mash([{ tempC: 63, minutes: 75 }]))).toBeCloseTo(0.867, 1);
		expect(fermentable(mash([{ tempC: 66, minutes: 60 }]))).toBeCloseTo(0.831, 1);
		expect(fermentable(mash([{ tempC: 70, minutes: 60 }]))).toBeCloseTo(0.705, 1);
		expect(fermentable(mash([{ tempC: 72, minutes: 60 }]))).toBeCloseTo(0.659, 1);
	});

	it('a cool rest is more fermentable than a hot one, monotonically', () => {
		const temps = [62, 64, 66, 68, 70, 72];
		const limits = temps.map((t) => fermentable(mash([{ tempC: t, minutes: 60 }])));
		for (let i = 1; i < limits.length; i++) expect(limits[i]).toBeLessThan(limits[i - 1]);
	});

	it('beta-amylase dies in a hot rest and survives a cool one', () => {
		const cool = mash([{ tempC: 63, minutes: 60 }]).enzymesLeft;
		const hot = mash([{ tempC: 72, minutes: 60 }]).enzymesLeft;
		expect(hot.beta).toBeLessThan(cool.beta * 0.2);
		expect(hot.alpha).toBeLessThan(cool.alpha);
	});

	it('a mash-out finishes off both enzymes', () => {
		const k = mash([
			{ tempC: 66, minutes: 60 },
			{ tempC: 76, minutes: 10 }
		]);
		// Beta is gone; alpha is the heat-tolerant one and ten minutes at 76 °C
		// only knocks it back — which is why a mash-out is a stop, not a kill.
		expect(k.enzymesLeft.beta).toBeLessThan(0.05);
		expect(k.enzymesLeft.alpha).toBeLessThan(mash([{ tempC: 66, minutes: 60 }]).enzymesLeft.alpha);
	});

	it('converts nearly all the starch in an hour and not in a quarter of one', () => {
		expect(mash([{ tempC: 66, minutes: 60 }]).conversion).toBeGreaterThan(0.95);
		expect(mash([{ tempC: 66, minutes: 15 }]).conversion).toBeLessThan(
			mash([{ tempC: 66, minutes: 60 }]).conversion
		);
	});

	it('a grist short of enzyme converts more slowly', () => {
		const weak = mash([{ tempC: 66, minutes: 30 }], { diastaticPowerLintner: 25 });
		const strong = mash([{ tempC: 66, minutes: 30 }], { diastaticPowerLintner: 110 });
		expect(weak.conversion).toBeLessThan(strong.conversion);
	});

	it('the enzymes prefer the pH window', () => {
		const good = mash([{ tempC: 66, minutes: 30 }], { mashPh: 5.4 });
		const alkaline = mash([{ tempC: 66, minutes: 30 }], { mashPh: 6.2 });
		expect(alkaline.conversion).toBeLessThan(good.conversion);
	});

	it('conserves mass through the integration, one sample a minute', () => {
		const k = mash([{ tempC: 66, minutes: 60 }]);
		expect(k.curve.length).toBeGreaterThanOrEqual(60);
		const total = (s: typeof k.spectrum) =>
			s.starch + s.dextrins + s.maltotriose + s.maltose + s.glucose;
		const first = total(k.curve[0].spectrum);
		for (const p of k.curve) expect(total(p.spectrum)).toBeCloseTo(first, 6);
	});

	it('is deterministic', () => {
		const a = mash([{ tempC: 65, minutes: 45 }]);
		const b = mash([{ tempC: 65, minutes: 45 }]);
		expect(a).toEqual(b);
	});
});
