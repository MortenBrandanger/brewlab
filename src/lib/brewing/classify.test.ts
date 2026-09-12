import { describe, expect, test } from 'vitest';
import { classify, closestStyles, styleConformity, styleGuidance } from './classify';
import { STYLES } from './styles';
import { simulate } from './simulate';
import { buildExample, defaultRecipe, ferm, fermStep } from './recipes';
import type { Recipe } from './types';

const resultFor = (id: string) => simulate(buildExample(id)!);

describe('style matching', () => {
	test('each seed recipe matches its intended style closely', () => {
		const expectations: [string, string][] = [
			['house-pale-ale', 'pale-ale'],
			['west-coast-ipa', 'ipa'],
			['hazy-ipa', 'neipa'],
			['english-bitter', 'british-bitter'],
			['czech-lager', 'czech-pilsner'],
			['marzen', 'marzen'],
			['dry-stout', 'dry-stout'],
			['milk-stout', 'sweet-stout'],
			['imperial-stout', 'imperial-stout'],
			['saison', 'saison'],
			['dubbel', 'dubbel'],
			['hefeweizen', 'hefeweizen']
		];
		for (const [exampleId, styleId] of expectations) {
			const result = resultFor(exampleId);
			expect(result.styles[0]?.styleId, `${exampleId} should read as ${styleId}`).toBe(styleId);
			expect(result.styles[0].match).toBeGreaterThanOrEqual(85);
		}
	});

	test('matches are reported as a percentage, never as a probability', () => {
		const result = resultFor('house-pale-ale');
		for (const match of result.styles) {
			expect(match.match).toBeGreaterThanOrEqual(0);
			expect(match.match).toBeLessThanOrEqual(100);
			expect(Number.isInteger(match.match)).toBe(true);
		}
	});

	test('sour styles need an actual souring culture', () => {
		const result = resultFor('saison');
		expect(result.styles.map((s) => s.styleId)).not.toContain('sour-wild');

		const sourRecipe: Recipe = {
			...defaultRecipe(),
			hops: [],
			fermentation: {
				yeastId: 'mixed-sour',
				pitchRate: 'standard',
				steps: [fermStep('Primary', 24, 30)],
				coldCrash: false
			}
		};
		const sour = simulate(sourRecipe);
		expect(sour.styles.map((s) => s.styleId)).toContain('sour-wild');
	});

	test('deviations name what pulls the beer away from the style', () => {
		const result = resultFor('imperial-stout');
		const pilsnerMatch = classify(result.metrics, result.sensory, false).find(
			(m) => m.styleId === 'german-pils'
		);
		expect(pilsnerMatch!.match).toBeLessThan(30);
		expect(pilsnerMatch!.deviations.length).toBeGreaterThan(0);
	});

	test('weak matches are filtered out of the shortlist', () => {
		const result = resultFor('imperial-stout');
		const all = classify(result.metrics, result.sensory, false);
		expect(closestStyles(all).every((m) => m.match >= 45)).toBe(true);
		expect(closestStyles(all).length).toBeLessThanOrEqual(4);
	});
});

describe('style conformity is independent of quality', () => {
	test('a technically poor beer can still match a style, and a good one can match none', () => {
		const flawed = resultFor('flawed-brown');
		expect(flawed.scores.technical.value).toBeLessThan(40);
		expect(flawed.styles[0]?.match ?? 0).toBeGreaterThan(50);
	});

	test('setting a target style does not change any score', () => {
		const plain = defaultRecipe();
		const targeted: Recipe = { ...plain, targetStyleId: 'imperial-stout' };
		const a = simulate(plain);
		const b = simulate(targeted);
		expect(b.scores).toEqual(a.scores);
		expect(b.metrics).toEqual(a.metrics);
		expect(b.targetStyle?.styleId).toBe('imperial-stout');
		expect(b.targetStyle!.match).toBeLessThan(55);
	});
});

describe('style guidance', () => {
	test('reports which metrics sit below, inside or above the target', () => {
		const result = simulate(defaultRecipe());
		const guidance = styleGuidance('imperial-stout', result.metrics);
		expect(guidance).toHaveLength(5);
		expect(guidance.find((g) => g.key === 'abv')?.state).toBe('below');
		expect(guidance.every((g) => typeof g.format(g.value) === 'string')).toBe(true);
	});

	test('conformity of a recipe against its own style is high', () => {
		const result = resultFor('dry-stout');
		expect(styleConformity('dry-stout', result.metrics, result.sensory)!.match).toBeGreaterThan(85);
	});

	test('an unknown style id is handled without throwing', () => {
		const result = simulate(defaultRecipe());
		expect(styleConformity('not-a-style', result.metrics, result.sensory)).toBeUndefined();
		expect(styleGuidance('not-a-style', result.metrics)).toEqual([]);
	});
});

describe('the style catalogue', () => {
	test('covers at least twenty styles with sane ranges', () => {
		expect(STYLES.length).toBeGreaterThanOrEqual(20);
		for (const style of STYLES) {
			expect(style.og.min).toBeLessThan(style.og.max);
			expect(style.abv.min).toBeLessThan(style.abv.max);
			expect(style.ibu.min).toBeLessThan(style.ibu.max);
			expect(style.ebc.min).toBeLessThan(style.ebc.max);
		}
	});

	test('a beer built from a style midpoint matches that style well', () => {
		// Sanity check on the classifier itself rather than on any recipe.
		const style = STYLES.find((s) => s.id === 'pale-ale')!;
		const metrics = simulate({ ...defaultRecipe(), fermentables: [ferm('pale-ale', 4.6)] }).metrics;
		const mid = {
			...metrics,
			og: (style.og.min + style.og.max) / 2,
			fg: (style.fg.min + style.fg.max) / 2,
			abv: (style.abv.min + style.abv.max) / 2,
			ibu: (style.ibu.min + style.ibu.max) / 2,
			ebc: (style.ebc.min + style.ebc.max) / 2
		};
		const sensory = simulate(defaultRecipe()).sensory;
		const match = classify(mid, sensory, false).find((m) => m.styleId === 'pale-ale')!;
		expect(match.match).toBeGreaterThan(80);
	});
});
