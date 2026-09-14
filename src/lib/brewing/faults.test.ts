import { describe, expect, test } from 'vitest';
import { simulate } from './simulate';
import { boilHop, defaultRecipe, dryHop, ferm, fermStep, step } from './recipes';
import type { Recipe } from './types';

const base = (overrides: Partial<Recipe> = {}): Recipe => ({ ...defaultRecipe(), ...overrides });
const codes = (recipe: Recipe): string[] => simulate(recipe).findings.map((f) => f.code);

describe('mash findings', () => {
	test('a hot mash is flagged', () => {
		expect(codes(base({ mash: { steps: [step('alpha', 73, 60)], thicknessLPerKg: 3 } }))).toContain(
			'MASH_TOO_HOT'
		);
	});
	test('a cool mash is flagged', () => {
		expect(codes(base({ mash: { steps: [step('beta', 60, 60)], thicknessLPerKg: 3 } }))).toContain(
			'MASH_TOO_COOL'
		);
	});
	test('a mash with no conversion step is a severe finding', () => {
		const result = simulate(
			base({ mash: { steps: [step('protein', 50, 60)], thicknessLPerKg: 3 } })
		);
		const finding = result.findings.find((f) => f.code === 'MASH_NO_CONVERSION');
		expect(finding?.severity).toBe('severe');
	});
	test('a grist of mostly adjuncts is flagged for low diastatic power', () => {
		expect(
			codes(base({ fermentables: [ferm('pale-ale', 1.5), ferm('flaked-oats', 3)] }))
		).toContain('LOW_DIASTATIC_POWER');
	});
});

describe('water findings', () => {
	test('a pale beer on alkaline water is flagged', () => {
		const recipe = base({
			water: { profileId: 'dark-alkaline', salts: defaultRecipe().water.salts, lacticAcidMl: 0 }
		});
		expect(codes(recipe)).toContain('WATER_ALKALINE_PALE_BEER');
	});
	test('too much Epsom salt is flagged as metallic', () => {
		const recipe = base({
			water: {
				profileId: 'balanced',
				salts: { ...defaultRecipe().water.salts, epsom: 15 },
				lacticAcidMl: 4
			}
		});
		expect(codes(recipe)).toContain('WATER_MAGNESIUM_HIGH');
	});
	test('a well-acidified pale beer gets the positive pH finding', () => {
		expect(codes(base())).toContain('MASH_PH_GOOD');
	});
});

describe('balance findings', () => {
	test('a sweet beer with almost no bitterness is called cloying', () => {
		const recipe = base({
			fermentables: [ferm('pale-ale', 4), ferm('crystal-dark', 0.8), ferm('lactose', 0.6)],
			mash: { steps: [step('alpha', 72, 60)], thicknessLPerKg: 3 },
			hops: [boilHop('fuggle', 4, 60)]
		});
		const found = codes(recipe);
		expect(found).toContain('CLOYING');
	});

	test('bitterness far ahead of gravity is flagged as harsh', () => {
		const recipe = base({
			fermentables: [ferm('pale-ale', 3)],
			hops: [boilHop('columbus', 70, 60)]
		});
		expect(codes(recipe)).toContain('BITTERNESS_HARSH');
	});

	test('a beer with no hops at all is flagged', () => {
		expect(codes(base({ hops: [] }))).toContain('NO_BITTERNESS');
	});
});

describe('process findings', () => {
	test('slow chilling is flagged', () => {
		expect(
			codes(base({ chill: { minutes: 120, pitchTempC: 18, transferQuality: 'normal' } }))
		).toContain('CHILL_SLOW');
	});
	test('pitching hot is flagged', () => {
		expect(
			codes(base({ chill: { minutes: 25, pitchTempC: 32, transferQuality: 'normal' } }))
		).toContain('PITCH_HOT');
	});
	test('a short boil on pilsner malt raises DMS risk', () => {
		const recipe = base({
			fermentables: [ferm('pilsner', 5)],
			boilTimeMin: 30
		});
		expect(codes(recipe)).toContain('DMS_RISK');
	});
	test('a careless transfer raises oxidation risk', () => {
		expect(
			codes(base({ chill: { minutes: 25, pitchTempC: 18, transferQuality: 'careless' } }))
		).toContain('OXIDATION_RISK');
	});
	test('a closed transfer on a hoppy beer is rewarded', () => {
		expect(
			codes(base({ chill: { minutes: 20, pitchTempC: 18, transferQuality: 'closed' } }))
		).toContain('COLD_SIDE_CAREFUL');
	});
});

describe('fermentation findings', () => {
	const ferment = (tempC: number, days: number, yeastId = 'american-ale') =>
		base({
			fermentation: {
				yeastId,
				pitchRate: 'standard',
				steps: [fermStep('Primary', tempC, days)],
				coldCrash: true
			}
		});

	test('fermenting above the strain range is flagged', () => {
		expect(codes(ferment(30, 14))).toContain('FERMENT_TOO_WARM');
	});
	test('fermenting below the strain range is flagged', () => {
		expect(codes(ferment(9, 14))).toContain('FERMENT_TOO_COLD');
	});
	test('hot fermentation on a strong wort raises fusel risk', () => {
		const strong = base({
			fermentables: [ferm('pale-ale', 8)],
			fermentation: {
				yeastId: 'american-ale',
				pitchRate: 'under',
				steps: [fermStep('Primary', 28, 14)],
				coldCrash: false
			}
		});
		expect(codes(strong)).toContain('FUSEL_RISK');
	});
	test('a rushed fermentation is flagged', () => {
		expect(codes(ferment(19, 3))).toContain('FERMENT_SHORT');
	});
	test('a cold, rushed lager raises diacetyl risk', () => {
		expect(codes(ferment(10, 6, 'german-lager'))).toContain('DIACETYL_RISK');
	});
	test('a lager with a warm rest is rewarded and avoids the diacetyl finding', () => {
		const recipe = base({
			fermentation: {
				yeastId: 'german-lager',
				pitchRate: 'over',
				steps: [fermStep('Primary', 11, 16), fermStep('Diacetyl rest', 16, 3)],
				coldCrash: true
			}
		});
		const found = codes(recipe);
		expect(found).toContain('DIACETYL_REST_PRESENT');
		expect(found).not.toContain('DIACETYL_RISK');
	});
	test('exceeding alcohol tolerance is flagged', () => {
		const huge = base({
			fermentables: [ferm('pale-ale', 10), ferm('brewing-sugar', 2)],
			batchVolumeL: 18,
			fermentation: {
				yeastId: 'english-ale',
				pitchRate: 'over',
				steps: [fermStep('Primary', 20, 21)],
				coldCrash: false
			}
		});
		expect(codes(huge)).toContain('ALCOHOL_TOLERANCE_EXCEEDED');
	});
});

describe('hop and packaging findings', () => {
	test('extreme dry hopping is flagged', () => {
		expect(
			codes(base({ hops: [boilHop('magnum', 15, 60), dryHop('citra', 300, 3, 5)] }))
		).toContain('DRY_HOP_EXTREME');
	});
	test('a very long dry hop is flagged', () => {
		expect(
			codes(base({ hops: [boilHop('magnum', 15, 60), dryHop('citra', 60, 14, 5)] }))
		).toContain('DRY_HOP_TOO_LONG');
	});
	test('hops and a souring culture are flagged as working against each other', () => {
		const recipe = base({
			fermentation: {
				yeastId: 'mixed-sour',
				pitchRate: 'standard',
				steps: [fermStep('Primary', 24, 30)],
				coldCrash: false
			}
		});
		expect(codes(recipe)).toContain('SOUR_HOP_CONFLICT');
	});
	test('a hoppy beer aged for months is flagged for faded aroma', () => {
		expect(codes(base({ conditioning: { days: 150, tempC: 18, co2Volumes: 2.4 } }))).toContain(
			'HOP_AROMA_FADED'
		);
	});
	test('a strong dark beer packaged immediately is flagged as needing time', () => {
		const recipe = base({
			fermentables: [ferm('maris-otter', 7), ferm('chocolate', 0.5), ferm('roasted-barley', 0.3)],
			conditioning: { days: 5, tempC: 10, co2Volumes: 2.2 }
		});
		expect(codes(recipe)).toContain('CONDITIONING_SHORT');
	});
});

describe('findings are well formed', () => {
	test('every finding has a code, a title and an explanation', () => {
		const result = simulate(base({ mash: { steps: [step('alpha', 74, 20)], thicknessLPerKg: 5 } }));
		for (const finding of result.findings) {
			expect(finding.code).toMatch(/^[A-Z0-9_]+$/);
			expect(finding.title.length).toBeGreaterThan(3);
			expect(finding.explanation.length).toBeGreaterThan(30);
		}
	});

	test('findings are ordered by severity', () => {
		const rank = { severe: 0, warning: 1, caution: 2, info: 3 };
		const result = simulate(
			base({ chill: { minutes: 150, pitchTempC: 34, transferQuality: 'careless' } })
		);
		const ranks = result.findings.map((f) => rank[f.severity]);
		expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
	});
});

/*
 * Two malts over their usual share produce two findings with the same code,
 * and a keyed list on the report used that code as its key. Svelte refused
 * to render the report for exactly this recipe, and the page silently stayed
 * on the previous question with the taste stage marked current. Codes are
 * stable identifiers for the *kind* of finding; they are not unique per beer.
 */
import { EXAMPLES as ALL_EXAMPLES } from './recipes';
import { simulate as run } from './simulate';
import { it as spec, expect as check } from 'vitest';

spec('a finding code can appear more than once in one report', () => {
	const r = ALL_EXAMPLES.find((e) => e.name === 'Something went wrong here')!.build();
	const codes = run(r).findings.map((f) => f.code);
	check(new Set(codes).size).toBeLessThan(codes.length);
});
