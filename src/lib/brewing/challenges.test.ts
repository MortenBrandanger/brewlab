import { describe, expect, test } from 'vitest';
import { CHALLENGES, evaluateChallenge } from './challenges';
import { simulate } from './simulate';
import {
	EXAMPLE_BY_ID,
	boilHop,
	defaultRecipe,
	dryHop,
	ferm,
	fermStep,
	salts,
	step,
	whirlpoolHop
} from './recipes';
import type { Recipe } from './types';

const base = (overrides: Partial<Recipe> = {}): Recipe => ({ ...defaultRecipe(), ...overrides });

/** A worked solution for every challenge, which doubles as proof each is possible. */
const SOLUTIONS: Record<string, () => Recipe> = {
	'session-ipa': () =>
		base({
			fermentables: [ferm('pale-ale', 2.9), ferm('wheat-malt', 0.3)],
			mash: { steps: [step('alpha', 67, 60), step('mashout', 76, 10)], thicknessLPerKg: 3 },
			water: { profileId: 'hop-forward', salts: salts({ gypsum: 4 }), lacticAcidMl: 3 },
			hops: [
				boilHop('magnum', 20, 60),
				whirlpoolHop('citra', 50, 20, 78),
				dryHop('citra', 60, 3, 6),
				dryHop('mosaic', 40, 3, 6)
			],
			chill: { minutes: 20, pitchTempC: 18, transferQuality: 'closed' },
			conditioning: { days: 7, tempC: 4, co2Volumes: 2.4 }
		}),

	'soft-czech-lager': () => EXAMPLE_BY_ID.get('czech-lager')!.build(),

	'rescue-sweet-stout': () => {
		const start = EXAMPLE_BY_ID.get('oversweet-stout')!.build();
		return {
			...start,
			fermentables: [
				ferm('pale-ale', 4),
				ferm('crystal-medium', 0.25),
				ferm('chocolate', 0.4),
				ferm('roasted-barley', 0.15)
			],
			mash: { steps: [step('alpha', 66, 60), step('mashout', 76, 10)], thicknessLPerKg: 3 },
			hops: [boilHop('ekg', 38, 60), boilHop('fuggle', 15, 15)]
		};
	},

	'aroma-without-bitterness': () =>
		base({
			fermentables: [ferm('pale-ale', 4.2), ferm('flaked-oats', 0.4)],
			water: { profileId: 'malt-forward', salts: salts({ calciumChloride: 4 }), lacticAcidMl: 4 },
			hops: [
				boilHop('magnum', 6, 60),
				whirlpoolHop('citra', 60, 20, 75),
				dryHop('citra', 70, 3, 6),
				dryHop('mosaic', 60, 3, 6)
			],
			chill: { minutes: 20, pitchTempC: 18, transferQuality: 'closed' },
			conditioning: { days: 7, tempC: 4, co2Volumes: 2.4 }
		}),

	'four-ingredients': () =>
		base({
			fermentables: [ferm('maris-otter', 4.4)],
			water: {
				profileId: 'balanced',
				salts: salts({ gypsum: 3, calciumChloride: 2 }),
				lacticAcidMl: 4
			},
			mash: { steps: [step('alpha', 66, 60), step('mashout', 76, 10)], thicknessLPerKg: 3 },
			hops: [boilHop('ekg', 28, 60), boilHop('ekg', 20, 15), whirlpoolHop('ekg', 30, 20, 80)],
			fermentation: {
				yeastId: 'english-ale',
				pitchRate: 'standard',
				steps: [fermStep('Primary', 19, 8), fermStep('Finish', 20, 5)],
				coldCrash: true
			},
			chill: { minutes: 20, pitchTempC: 18, transferQuality: 'closed' },
			conditioning: { days: 14, tempC: 8, co2Volumes: 2.3 }
		}),

	'dry-saison': () => EXAMPLE_BY_ID.get('saison')!.build(),

	'balanced-imperial-stout': () =>
		base({
			name: 'Big stout',
			batchVolumeL: 19,
			preBoilVolumeL: 29,
			boilTimeMin: 90,
			efficiencyPct: 62,
			water: { profileId: 'dark-alkaline', salts: salts({ calciumChloride: 3 }), lacticAcidMl: 2 },
			fermentables: [
				ferm('maris-otter', 8.6),
				ferm('munich-dark', 0.8),
				ferm('crystal-medium', 0.45),
				ferm('chocolate', 0.5),
				ferm('roasted-barley', 0.35),
				ferm('flaked-oats', 0.5),
				ferm('brewing-sugar', 0.55)
			],
			mash: { steps: [step('alpha', 66, 75), step('mashout', 76, 10)], thicknessLPerKg: 2.8 },
			hops: [boilHop('magnum', 38, 60), boilHop('ekg', 25, 20)],
			fermentation: {
				yeastId: 'american-ale',
				pitchRate: 'over',
				steps: [fermStep('Primary', 18, 10), fermStep('Free rise', 21, 12)],
				coldCrash: false
			},
			chill: { minutes: 25, pitchTempC: 17, transferQuality: 'closed' },
			conditioning: { days: 150, tempC: 12, co2Volumes: 2.1 }
		}),

	'repair-the-brew': () => {
		const start = EXAMPLE_BY_ID.get('flawed-brown')!.build();
		return {
			...start,
			preBoilVolumeL: 26,
			boilTimeMin: 60,
			water: { profileId: 'balanced', salts: salts({ calciumChloride: 3 }), lacticAcidMl: 4 },
			fermentables: [ferm('pale-ale', 4.2), ferm('crystal-medium', 0.3), ferm('chocolate', 0.2)],
			mash: { steps: [step('alpha', 66, 60), step('mashout', 76, 10)], thicknessLPerKg: 3 },
			hops: [boilHop('challenger', 24, 60), boilHop('ekg', 20, 15)],
			fermentation: {
				yeastId: 'english-ale',
				pitchRate: 'standard',
				steps: [fermStep('Primary', 19, 8), fermStep('Finish', 20, 4)],
				coldCrash: true
			},
			chill: { minutes: 20, pitchTempC: 18, transferQuality: 'closed' },
			conditioning: { days: 14, tempC: 8, co2Volumes: 2.3 }
		};
	},

	'flawless-pilsner': () =>
		base({
			boilTimeMin: 90,
			preBoilVolumeL: 27,
			fermentables: [ferm('pilsner', 4.4)],
			water: {
				profileId: 'soft-pilsner',
				salts: salts({ calciumChloride: 3, gypsum: 1 }),
				lacticAcidMl: 3
			},
			mash: {
				steps: [step('beta', 63, 30), step('alpha', 72, 30), step('mashout', 76, 10)],
				thicknessLPerKg: 3
			},
			hops: [
				boilHop('magnum', 12, 60),
				boilHop('hallertau-mf', 20, 20),
				whirlpoolHop('saaz', 25, 15, 78)
			],
			fermentation: {
				yeastId: 'german-lager',
				pitchRate: 'over',
				steps: [fermStep('Primary', 11, 16), fermStep('Diacetyl rest', 16, 3)],
				coldCrash: true
			},
			chill: { minutes: 18, pitchTempC: 10, transferQuality: 'closed' },
			conditioning: { days: 35, tempC: 2, co2Volumes: 2.5 }
		}),

	'noble-restraint': () =>
		base({
			fermentables: [ferm('munich-light', 1.9), ferm('vienna', 1.1), ferm('pilsner', 0.3)],
			water: { profileId: 'balanced', salts: salts({ calciumChloride: 2 }), lacticAcidMl: 3 },
			mash: { steps: [step('alpha', 67, 60), step('mashout', 76, 10)], thicknessLPerKg: 3 },
			hops: [boilHop('hallertau-mf', 22, 60), boilHop('tettnanger', 14, 15)],
			fermentation: {
				yeastId: 'kolsch',
				pitchRate: 'standard',
				steps: [fermStep('Primary', 17, 9), fermStep('Finish', 19, 4)],
				coldCrash: true
			},
			chill: { minutes: 20, pitchTempC: 16, transferQuality: 'closed' },
			conditioning: { days: 21, tempC: 4, co2Volumes: 2.4 }
		})
};

describe('the challenge set', () => {
	test('there are at least eight challenges, each with checks and a hint', () => {
		expect(CHALLENGES.length).toBeGreaterThanOrEqual(8);
		for (const challenge of CHALLENGES) {
			expect(challenge.checks.length).toBeGreaterThanOrEqual(3);
			expect(challenge.hint.length).toBeGreaterThan(30);
			expect(challenge.brief.length).toBeGreaterThan(20);
		}
	});

	test('challenge ids are unique', () => {
		expect(new Set(CHALLENGES.map((c) => c.id)).size).toBe(CHALLENGES.length);
	});

	test('every challenge that starts from a recipe points at a real one', () => {
		for (const challenge of CHALLENGES) {
			if (challenge.startingRecipeId) {
				expect(EXAMPLE_BY_ID.has(challenge.startingRecipeId)).toBe(true);
			}
		}
	});
});

describe('every challenge is solvable', () => {
	for (const challenge of CHALLENGES) {
		test(`${challenge.name} can be completed`, () => {
			const recipe = SOLUTIONS[challenge.id]();
			const evaluation = evaluateChallenge(challenge, simulate(recipe), recipe);
			const failed = evaluation.checks.filter((c) => !c.passed).map((c) => c.label);
			expect(failed, `unmet: ${failed.join('; ')}`).toEqual([]);
			expect(evaluation.complete).toBe(true);
		});
	}
});

describe('challenges are not trivially complete', () => {
	test('the default pale ale does not complete every challenge', () => {
		const recipe = defaultRecipe();
		const result = simulate(recipe);
		const completed = CHALLENGES.filter((c) => evaluateChallenge(c, result, recipe).complete);
		expect(completed.length).toBeLessThan(CHALLENGES.length);
	});

	test('the starting recipe of a repair challenge does not already pass it', () => {
		for (const challenge of CHALLENGES.filter((c) => c.startingRecipeId)) {
			const recipe = EXAMPLE_BY_ID.get(challenge.startingRecipeId!)!.build();
			expect(evaluateChallenge(challenge, simulate(recipe), recipe).complete).toBe(false);
		}
	});

	test('a failing check throwing does not break evaluation', () => {
		const broken = {
			...CHALLENGES[0],
			checks: [
				{
					id: 'boom',
					label: 'throws',
					test: () => {
						throw new Error('nope');
					}
				}
			]
		};
		const recipe = defaultRecipe();
		expect(evaluateChallenge(broken, simulate(recipe), recipe).checks[0].passed).toBe(false);
	});
});
