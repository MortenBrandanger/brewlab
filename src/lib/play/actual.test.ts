import { describe, expect, it } from 'vitest';
import { buildExample } from '$lib/brewing/recipes';
import { simulate } from '$lib/brewing/simulate';
import {
	applyLog,
	co2FromPriming,
	emptyLog,
	fermentStepsFromDays,
	hopsFromDrops,
	mashStepsFromMinutes,
	primingGrams,
	volumesAfterBoil
} from './actual';

const pale = buildExample('house-pale-ale')!;

describe('what you did, as a recipe', () => {
	it('a perfectly held rest judges like the card', () => {
		// 60 minutes at 66, then 10 at 76: exactly the card's schedule, minute by minute.
		const temps = [...Array(60).fill(66), ...Array(10).fill(76)];
		const done = { ...pale, mash: { ...pale.mash, steps: mashStepsFromMinutes(temps) } };
		expect(simulate(done).metrics.fg).toBeCloseTo(simulate(pale).metrics.fg, 3);
	});

	it('a tun that drifted warm finishes sweeter', () => {
		const warm = Array.from({ length: 60 }, (_, i) => 69 - i * 0.02);
		const done = { ...pale, mash: { ...pale.mash, steps: mashStepsFromMinutes(warm) } };
		expect(simulate(done).metrics.fg).toBeGreaterThan(simulate(pale).metrics.fg);
	});

	it('steam concentrates the wort, a boil-over only makes less of it', () => {
		const base = simulate(volumesAfterBoil(pale, 26, 6)).metrics;
		const harder = simulate(volumesAfterBoil(pale, 26, 8)).metrics;
		// Spilt wort carries its sugar with it: less beer, never a weaker one.
		const spilt = volumesAfterBoil(pale, 26, 0, 2);
		const unspilt = volumesAfterBoil(pale, 26, 0);
		expect(harder.og).toBeGreaterThan(base.og);
		expect(spilt.batchVolumeL).toBeLessThan(unspilt.batchVolumeL);
		expect(simulate(spilt).metrics.og).toBeCloseTo(simulate(unspilt).metrics.og, 3);
	});

	it('a hop boils for as long as it was actually in', () => {
		const [bittering] = hopsFromDrops(
			[{ cardId: 'a', hopId: 'magnum', grams: 15, use: 'boil', at: 4 }],
			52,
			{ minutes: 0, meanTempC: 90 },
			14
		);
		expect(bittering.time).toBe(48);
	});

	it('groups steady days into one fermentation step', () => {
		const steps = fermentStepsFromDays([19, 19, 19.2, 19, 21, 21]);
		expect(steps.map((s) => s.days)).toEqual([4, 2]);
	});

	it('the card dose of sugar gives the card carbonation', () => {
		expect(co2FromPriming(pale, primingGrams(pale))).toBeCloseTo(pale.conditioning.co2Volumes, 1);
	});
});

describe('the whole day', () => {
	it('an empty log is the card', () => {
		expect(simulate(applyLog(pale, emptyLog())).metrics).toEqual(simulate(pale).metrics);
	});

	it('hops never dropped are not in the beer', () => {
		const log = {
			...emptyLog(),
			done: ['boil'],
			boil: { rollingMinutes: 60, evaporatedL: 6, boilOverL: 0 },
			collectedL: 26
		};
		expect(simulate(applyLog(pale, log)).metrics.ibu).toBeLessThan(1);
	});
});
