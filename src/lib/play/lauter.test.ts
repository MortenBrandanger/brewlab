import { describe, expect, it } from 'vitest';
import { buildExample } from '$lib/brewing/recipes';
import { GRAIN_ABSORPTION_L_PER_KG } from '$lib/brewing/simulate';
import { CLEAR_AFTER_JUGS } from './actual';
import { newRunoff, runningsCloud, runsClear, stepRunoff, tapFlow } from './lauter';

describe('the run-off', () => {
	it('is still cloudy after one jug and clear at the threshold applyLog uses', () => {
		expect(runningsCloud(0)).toBe(1);
		expect(runningsCloud(1)).toBeGreaterThan(0.3);
		expect(runningsCloud(CLEAR_AFTER_JUGS)).toBeLessThan(0.1);
		expect(runsClear(CLEAR_AFTER_JUGS)).toBe(true);
		expect(runsClear(CLEAR_AFTER_JUGS - 0.5)).toBe(false);
	});

	it('trickles at the end: a low head runs slower than a full one', () => {
		expect(tapFlow(0.2)).toBeLessThan(tapFlow(5) / 3);
	});

	it('collects the card pre-boil volume when the card rinse is poured and drained', () => {
		const pale = buildExample('house-pale-ale')!;
		const grain = pale.fermentables.reduce((s, f) => s + f.weightKg, 0);
		const mashWater = pale.mash.thicknessLPerKg * grain;
		const rinse = pale.preBoilVolumeL + grain * GRAIN_ABSORPTION_L_PER_KG - mashWater;
		let s = newRunoff(mashWater, grain, rinse);
		for (let i = 0; i < 4000; i++) s = stepRunoff(s, 0.05, 2);
		expect(s.potL).toBeCloseTo(0, 6);
		expect(s.collectedL).toBeCloseTo(pale.preBoilVolumeL, 1);
	});

	it('keeps coming after you stop pouring', () => {
		let s = newRunoff(15, 5, 20);
		for (let i = 0; i < 40; i++) s = stepRunoff(s, 0.1, 2);
		const atStop = s.collectedL;
		for (let i = 0; i < 40; i++) s = stepRunoff(s, 0.1, 0);
		expect(s.collectedL - atStop).toBeGreaterThan(1);
	});
});
