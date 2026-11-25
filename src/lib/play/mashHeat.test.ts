import { describe, expect, it } from 'vitest';
import { strikeTempC } from '$lib/brewing/calculations';
import { addGrain, afterGrainC, newTun, probeC, stepTun, stir } from './mashHeat';

describe('the tun you heat by hand', () => {
	it('lands where the strike formula says it will', () => {
		// 15 L on 5 kg is 3 L/kg. Heat to the strike temperature for 66 °C, tip
		// all the grain in, and the mash must be at 66.
		const strike = strikeTempC(66, 3);
		const mashed = addGrain(newTun(15, strike), 5);
		expect(mashed.tempC).toBeCloseTo(66, 6);
		expect(afterGrainC(newTun(15, strike), 5)).toBeCloseTo(66, 6);
	});

	it('coasts upwards after the flame is cut, but not far', () => {
		let s = { ...newTun(15, 50), flame: 1 };
		for (let i = 0; i < 300; i++) s = stepTun(s, 0.02);
		const atCut = s.tempC;
		s = { ...s, flame: 0 };
		let peak = atCut;
		for (let i = 0; i < 300; i++) {
			s = stepTun(s, 0.02);
			peak = Math.max(peak, s.tempC);
		}
		expect(peak - atCut).toBeGreaterThan(0.5);
		expect(peak - atCut).toBeLessThan(2.5);
	});

	it('loses about two degrees over a lidded hour', () => {
		let s = { ...addGrain(newTun(15, 72), 5), lid: true };
		const start = s.tempC;
		for (let i = 0; i < 600; i++) s = stepTun(s, 0.1);
		expect(start - s.tempC).toBeGreaterThan(1.2);
		expect(start - s.tempC).toBeLessThan(3);
	});

	it('reads true only once the mash is stirred', () => {
		let s = addGrain(newTun(15, 72), 5);
		const worst = Math.max(
			...Array.from({ length: 40 }, (_, i) => Math.abs(probeC({ ...s, minute: i * 0.3 }) - s.tempC))
		);
		expect(worst).toBeGreaterThan(1);
		for (let i = 0; i < 40; i++) s = stir(s, 1, 0.1);
		expect(Math.abs(probeC(s) - s.tempC)).toBeLessThan(0.1);
	});
});
