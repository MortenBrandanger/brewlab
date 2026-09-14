import { describe, expect, it } from 'vitest';
import { EXAMPLES } from './recipes';
import { buildContext } from './simulate';
import { playbackFor } from './playback';

const ctx = buildContext(EXAMPLES[0].build())!;

describe('playback', () => {
	it('plays the three processes and nothing else', () => {
		expect(playbackFor('mash', ctx)?.title).toBe('Mashing');
		expect(playbackFor('boil', ctx)?.title).toBe('Boiling');
		expect(playbackFor('ferment', ctx)?.title).toBe('Fermenting');
		expect(playbackFor('water', ctx)).toBeUndefined();
		expect(playbackFor('taste', ctx)).toBeUndefined();
	});

	it('runs from nothing to the figure the report shows', () => {
		const boil = playbackFor('boil', ctx)!;
		expect(boil.samples[0].primary).toBe('0 IBU');
		// The kettle hops only: the whirlpool charge has not happened yet.
		expect(boil.samples.at(-1)!.level).toBeCloseTo(1, 5);
		expect(parseInt(boil.samples.at(-1)!.primary)).toBeGreaterThan(0);

		const ferment = playbackFor('ferment', ctx)!;
		expect(ferment.samples.at(-1)!.primary).toBe(ctx.attenuation.fg.toFixed(3));
		expect(ferment.samples.at(-1)!.level).toBeCloseTo(1, 5);
	});

	it('only ever moves forward', () => {
		for (const stage of ['mash', 'boil', 'ferment'] as const) {
			const p = playbackFor(stage, ctx)!;
			for (let i = 1; i < p.samples.length; i++) {
				expect(p.samples[i].at).toBeGreaterThanOrEqual(p.samples[i - 1].at);
				expect(p.samples[i].level).toBeGreaterThanOrEqual(p.samples[i - 1].level - 1e-6);
			}
		}
	});
});
