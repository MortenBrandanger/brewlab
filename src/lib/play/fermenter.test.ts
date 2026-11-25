import { describe, expect, it } from 'vitest';
import { buildExample } from '$lib/brewing/recipes';
import { buildContext, simulate } from '$lib/brewing/simulate';
import { fermenterToday } from './fermenter';

const pale = buildExample('house-pale-ale')!;
const ctx = buildContext(pale)!;
const cardDays = pale.fermentation.steps.flatMap((s) => Array<number>(s.days).fill(s.tempC));

describe('the fermenter, day by day', () => {
	it('reads the report’s final gravity on the card’s last day', () => {
		// The card cold-crashes, which changes no gravity, only the yeast.
		const today = fermenterToday(ctx, pale.fermentation.pitchRate, cardDays);
		expect(today.gravity).toBeCloseTo(simulate(pale).metrics.fg, 3);
	});

	it('works hardest in the first days and goes quiet', () => {
		const early = fermenterToday(ctx, 'standard', cardDays.slice(0, 2)).activity;
		const late = fermenterToday(ctx, 'standard', cardDays).activity;
		expect(early).toBeGreaterThan(2);
		expect(late).toBeLessThan(0.3);
	});

	it('a cold fermenter barely moves', () => {
		const cold = fermenterToday(ctx, 'standard', Array(4).fill(6));
		const warm = fermenterToday(ctx, 'standard', Array(4).fill(19));
		expect(cold.gravity).toBeGreaterThan(warm.gravity);
	});
});
