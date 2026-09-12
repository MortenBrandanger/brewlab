import { describe, expect, test } from 'vitest';
import { WATER_PROFILE_BY_ID, computeWater } from './water';
import { ferm, salts } from './recipes';
import type { WaterSetup } from './types';

const setup = (profileId: string, overrides: Partial<WaterSetup> = {}): WaterSetup => ({
	profileId,
	salts: salts(),
	lacticAcidMl: 0,
	...overrides
});

const paleGrist = [ferm('pale-ale', 5)];
const darkGrist = [ferm('pale-ale', 4), ferm('roasted-barley', 0.5), ferm('chocolate', 0.3)];

describe('mineral additions', () => {
	test('gypsum raises calcium and sulfate', () => {
		const plain = computeWater(setup('ro'), paleGrist, 25, 3);
		const gypsum = computeWater(setup('ro', { salts: salts({ gypsum: 5 }) }), paleGrist, 25, 3);
		expect(gypsum.final.sulfate).toBeGreaterThan(plain.final.sulfate + 50);
		expect(gypsum.final.calcium).toBeGreaterThan(plain.final.calcium + 20);
		expect(gypsum.final.chloride).toBe(plain.final.chloride);
	});

	test('calcium chloride raises chloride and swings the sulfate ratio the other way', () => {
		const gypsum = computeWater(setup('ro', { salts: salts({ gypsum: 5 }) }), paleGrist, 25, 3);
		const chloride = computeWater(
			setup('ro', { salts: salts({ calciumChloride: 5 }) }),
			paleGrist,
			25,
			3
		);
		expect(chloride.sulfateChlorideRatio).toBeLessThan(gypsum.sulfateChlorideRatio);
	});

	test('chalk is modelled as only partly soluble', () => {
		const chalk = computeWater(setup('ro', { salts: salts({ chalk: 5 }) }), paleGrist, 25, 3);
		const soda = computeWater(setup('ro', { salts: salts({ bakingSoda: 5 }) }), paleGrist, 25, 3);
		// Chalk carries more bicarbonate per gram but dissolves far less of it.
		expect(chalk.final.bicarbonate).toBeLessThan(soda.final.bicarbonate);
	});

	test('the same salt in more water gives a lower concentration', () => {
		const small = computeWater(setup('ro', { salts: salts({ gypsum: 4 }) }), paleGrist, 15, 3);
		const large = computeWater(setup('ro', { salts: salts({ gypsum: 4 }) }), paleGrist, 40, 3);
		expect(large.final.sulfate).toBeLessThan(small.final.sulfate);
	});
});

describe('residual alkalinity', () => {
	test('calcium and magnesium offset bicarbonate', () => {
		const result = computeWater(setup('dark-alkaline'), darkGrist, 25, 3);
		const profile = WATER_PROFILE_BY_ID.get('dark-alkaline')!;
		expect(result.alkalinity).toBeCloseTo(profile.bicarbonate * 0.8197, 0);
		expect(result.residualAlkalinity).toBeLessThan(result.alkalinity);
	});
});

describe('mash pH', () => {
	test('a pale grist on soft water lands near its distilled-water pH', () => {
		const result = computeWater(setup('soft-pilsner'), paleGrist, 25, 3);
		expect(result.mashPh).toBeGreaterThan(5.5);
		expect(result.mashPh).toBeLessThan(5.9);
	});

	test('alkaline water pushes pH up', () => {
		const soft = computeWater(setup('soft-pilsner'), paleGrist, 25, 3);
		const alkaline = computeWater(setup('dark-alkaline'), paleGrist, 25, 3);
		expect(alkaline.mashPh).toBeGreaterThan(soft.mashPh + 0.15);
	});

	test('roasted malt pulls pH down', () => {
		const pale = computeWater(setup('dark-alkaline'), paleGrist, 25, 3);
		const dark = computeWater(setup('dark-alkaline'), darkGrist, 25, 3);
		expect(dark.mashPh).toBeLessThan(pale.mashPh);
	});

	test('lactic acid lowers pH roughly in proportion to the dose', () => {
		const none = computeWater(setup('balanced'), paleGrist, 25, 3);
		const some = computeWater(setup('balanced', { lacticAcidMl: 3 }), paleGrist, 25, 3);
		const more = computeWater(setup('balanced', { lacticAcidMl: 6 }), paleGrist, 25, 3);
		expect(some.mashPh).toBeLessThan(none.mashPh);
		expect(more.mashPh).toBeLessThan(some.mashPh);
		const firstStep = none.mashPh - some.mashPh;
		const secondStep = some.mashPh - more.mashPh;
		expect(secondStep).toBeCloseTo(firstStep, 1);
	});

	test('acidulated malt acidifies without any acid bottle', () => {
		const plain = computeWater(setup('balanced'), paleGrist, 25, 3);
		const acidulated = computeWater(
			setup('balanced'),
			[ferm('pale-ale', 4.9), ferm('acidulated', 0.1)],
			25,
			3
		);
		expect(acidulated.mashPh).toBeLessThan(plain.mashPh);
	});

	test('pH stays inside physical bounds even with absurd inputs', () => {
		const flooded = computeWater(
			setup('dark-alkaline', { salts: salts({ bakingSoda: 500 }) }),
			paleGrist,
			25,
			3
		);
		const drowned = computeWater(setup('ro', { lacticAcidMl: 500 }), paleGrist, 25, 3);
		expect(flooded.mashPh).toBeLessThanOrEqual(7);
		expect(drowned.mashPh).toBeGreaterThanOrEqual(3.6);
		expect(Number.isFinite(flooded.mashPh)).toBe(true);
	});

	test('an empty grist still returns a usable number', () => {
		const empty = computeWater(setup('balanced'), [], 25, 3);
		expect(Number.isFinite(empty.mashPh)).toBe(true);
	});
});
