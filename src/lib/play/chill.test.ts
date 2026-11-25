import { describe, expect, it } from 'vitest';
import { newChill, outletC, stepChill, TAP_C } from './chill';

function minutesTo(target: number, flow: number, stir = 0) {
	let s = { ...newChill(95, 20), flow, stir };
	while (s.tempC > target && s.minute < 600) s = stepChill(s, 0.1);
	return s.minute;
}

describe('the immersion chiller', () => {
	it('takes twenty litres from 95 to 20 °C in twenty to thirty minutes at full flow', () => {
		const m = minutesTo(20, 1);
		expect(m).toBeGreaterThan(20);
		expect(m).toBeLessThan(30);
	});

	it('is faster when the coil is moved', () => {
		expect(minutesTo(20, 1, 1)).toBeLessThan(minutesTo(20, 1) * 0.8);
	});

	it('barely cools with the tap shut', () => {
		let s = newChill(95, 20);
		s = stepChill(s, 30);
		expect(s.tempC).toBeGreaterThan(80);
	});

	it('never cools below the tap', () => {
		const s = stepChill({ ...newChill(95, 20), flow: 1, stir: 1 }, 1000);
		expect(s.tempC).toBeGreaterThanOrEqual(TAP_C - 1e-6);
	});

	it('runs a hot outlet early and a cool one late', () => {
		const hot = { ...newChill(95, 20), flow: 0.6 };
		const cool = { ...hot, tempC: 22 };
		expect(outletC(hot)).toBeGreaterThan(50);
		expect(outletC(cool)).toBeLessThan(20);
	});

	it('the step size does not change the answer', () => {
		const a = stepChill({ ...newChill(95, 20), flow: 1 }, 10);
		let b = { ...newChill(95, 20), flow: 1 };
		for (let i = 0; i < 100; i++) b = stepChill(b, 0.1);
		expect(a.tempC).toBeCloseTo(b.tempC, 6);
	});
});
