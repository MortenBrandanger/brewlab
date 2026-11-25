import { describe, expect, it } from 'vitest';
import { newKettle, stepKettle, steadyEvaporation, STEADY, type KettleState } from './kettleHeat';

const DT = 0.02;

function run(s: KettleState, minutes: number, stirring = false): KettleState {
	for (let i = 0; i < minutes / DT; i++) s = stepKettle(s, DT, stirring);
	return s;
}

describe('the kettle you boil by hand', () => {
	const evap = steadyEvaporation(26, 20, 60);

	it('a steady boil takes off what the card expects over the card time', () => {
		// Already through the hot break, at the boil, gas steady.
		let s: KettleState = { ...newKettle(26, 100, evap), flame: STEADY, heat: STEADY, breakDone: 1 };
		s = run(s, 60);
		expect(s.rollingMin).toBeCloseTo(60, 0);
		expect(s.evaporatedL).toBeCloseTo(6, 1);
		expect(s.boilOverL).toBe(0);
	});

	it('a harder boil takes off more', () => {
		const base: KettleState = { ...newKettle(26, 100, evap), breakDone: 1 };
		const steady = run({ ...base, flame: STEADY, heat: STEADY }, 30);
		const hard = run({ ...base, flame: 1, heat: 1 }, 30);
		expect(hard.evaporatedL).toBeGreaterThan(steady.evaporatedL * 1.3);
	});

	it('full gas through the hot break boils over; turning it down does not', () => {
		const start = newKettle(26, 90, evap);
		const flatOut = run({ ...start, flame: 1 }, 15);
		expect(flatOut.boilOverL).toBeGreaterThan(0.2);

		// Bring it up hard, then turn down to a steady boil as it starts to foam.
		let careful = run({ ...start, flame: 1 }, 1);
		while (careful.tempC < 99) careful = stepKettle(careful, DT);
		careful = run({ ...careful, flame: 0.6 }, 15);
		expect(careful.boilOverL).toBe(0);
		expect(careful.breakDone).toBe(1);
	});

	it('a simmer at the boiling point does not count as boiling', () => {
		let s: KettleState = { ...newKettle(26, 100, evap), flame: 0.2, heat: 0.2, breakDone: 1 };
		s = run(s, 20);
		expect(s.tempC).toBeGreaterThan(98);
		expect(s.rollingMin).toBe(0);
		expect(s.evaporatedL).toBe(0);
	});

	it('with the gas off, cools a few degrees over twenty minutes, faster stirred', () => {
		const off = run(newKettle(20, 100, evap), 20);
		expect(100 - off.tempC).toBeGreaterThan(3);
		expect(100 - off.tempC).toBeLessThan(10);
		const stirred = run(newKettle(20, 100, evap), 20, true);
		expect(stirred.tempC).toBeLessThan(off.tempC - 5);
	});
});
