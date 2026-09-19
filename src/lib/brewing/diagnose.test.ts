import { describe, expect, test } from 'vitest';
import { defaultRecipe } from './recipes';
import { buildContext, recipeSrm } from './simulate';
import { appearanceOf } from './appearance';
import { computeFindings } from './faults';
import { diagnose, baselineGap, SUSPECTS, MIN_CLOSES } from './diagnose';
import type { Observation, Suspect } from './diagnose';
import type { Recipe, SensoryKey, SensoryVector } from './types';

/**
 * This suite has something most do not: an oracle.
 *
 * The forward model can brew the mistake itself. Take a recipe, apply a suspect at a
 * known magnitude, run the engine, and the beer that comes out is a beer somebody could
 * have poured — and we know exactly what they did, because we did it. So every case here
 * asks a question with a checkable answer rather than asserting that some number stayed
 * where it was.
 *
 * The risk that comes with an oracle is that the test passes for the wrong reason: hand
 * the diagnoser the whole thirteen-axis vector and it can find the suspect by arithmetic
 * that has nothing to do with tasting. So the realistic cases hand over three axes, which
 * is about what a person actually notices, and the last case breaks the search on purpose
 * to prove the earlier ones were doing work.
 */

const AXES: SensoryKey[] = [
	'sweetness',
	'bitterness',
	'body',
	'malt',
	'caramel',
	'roast',
	'hopFlavour',
	'hopAroma',
	'fruitEsters',
	'phenols',
	'acidity',
	'alcoholWarmth',
	'crispness'
];

/** Brew the mistake, and hand back the glass it produced. */
function brewWrong(recipe: Recipe, suspect: Suspect, magnitude: number) {
	const wrong = suspect.apply(recipe, magnitude);
	const ctx = buildContext(wrong)!;
	const base = buildContext(recipe)!;
	const baseFaults = new Set(computeFindings(base).map((f) => f.code));
	return {
		sensory: ctx.sensory,
		haze: appearanceOf(ctx, recipeSrm(wrong)).haze,
		newFaults: computeFindings(ctx)
			.map((f) => f.code)
			.filter((c) => !baseFaults.has(c)),
		/** the axes a drinker would actually have remarked on */
		noticed: (n: number): Partial<SensoryVector> => {
			const moved = AXES.map((k) => ({ k, d: Math.abs(ctx.sensory[k] - base.sensory[k]) }))
				.sort((a, b) => b.d - a.d)
				.filter((x) => x.d > 0.2)
				.slice(0, n);
			return Object.fromEntries(moved.map((x) => [x.k, ctx.sensory[x.k]]));
		}
	};
}

const rank = (out: ReturnType<typeof diagnose>, code: string) =>
	out.findIndex((e) => e.code === code);

describe('the model run backwards', () => {
	test('a beer that matches the recipe has nothing to explain', () => {
		const r = defaultRecipe();
		const ctx = buildContext(r)!;
		expect(baselineGap(r, { sensory: ctx.sensory })).toBeCloseTo(0, 5);
		expect(diagnose(r, { sensory: ctx.sensory })).toEqual([]);
	});

	test('it says nothing rather than guessing when nothing fits', () => {
		const r = defaultRecipe();
		const ctx = buildContext(r)!;
		// a beer that is somehow both far more roasty and far more acidic than anything a
		// process slip can produce from this grist: no ordinary mistake explains it
		const out = diagnose(r, { sensory: { ...ctx.sensory, roast: 9.5, acidity: 9.5 } });
		for (const e of out) expect(e.closes).toBeGreaterThanOrEqual(MIN_CLOSES);
		expect(out.filter((e) => e.closes > 0.5)).toEqual([]);
	});

	// Every suspect the default recipe can actually express. Four of the thirteen move
	// nothing measurable on a clean pale ale — they need a grist or a schedule that gives
	// them something to spoil — so they are covered by the fault-code case below instead.
	const visible = SUSPECTS.filter((s) => {
		const g = brewWrong(defaultRecipe(), s, s.steps[s.steps.length - 1]);
		return Object.keys(g.noticed(3)).length > 0;
	});

	test('the visible suspects are the ones we can hold to a ranking', () => {
		expect(visible.length).toBeGreaterThanOrEqual(7);
	});

	for (const suspect of SUSPECTS) {
		const isVisible = visible.some((v) => v.code === suspect.code);
		if (!isVisible) continue;
		// The smallest magnitude a drinker would remark on at all, which is not always the
		// smallest the suspect offers. Seven days off a fourteen-day schedule changes a
		// clean pale ale so little that nothing is noticed and nothing should be claimed —
		// the first version of this test picked the second magnitude for every suspect and
		// failed on exactly that one, which is the model being right rather than wrong.
		const magnitude =
			suspect.steps.find(
				(m) => Object.keys(brewWrong(defaultRecipe(), suspect, m).noticed(3)).length >= 2
			) ?? suspect.steps[suspect.steps.length - 1];

		test(`${suspect.code}: named first from the whole glass`, () => {
			const r = defaultRecipe();
			const g = brewWrong(r, suspect, magnitude);
			expect(rank(diagnose(r, { sensory: g.sensory, haze: g.haze }), suspect.code)).toBe(0);
		});

		test(`${suspect.code}: in the first two from three axes`, () => {
			const r = defaultRecipe();
			const g = brewWrong(r, suspect, magnitude);
			const at = rank(diagnose(r, { sensory: g.noticed(3) }), suspect.code);
			expect(at).toBeGreaterThanOrEqual(0);
			expect(at).toBeLessThanOrEqual(1);
		});
	}

	test('a named fault is enough on its own, with nothing tasted', () => {
		const r = defaultRecipe();
		for (const suspect of SUSPECTS) {
			const g = brewWrong(r, suspect, suspect.steps[suspect.steps.length - 1]);
			if (g.newFaults.length === 0) continue;
			const out = diagnose(r, { faults: g.newFaults });
			expect(out.map((e) => e.code)).toContain(suspect.code);
		}
	});

	test('every reported axis an explanation spoils is admitted in harms', () => {
		// A property rather than a case, because a case can pass by not arising. Over every
		// suspect and every magnitude the search will try: if a candidate moves a reported
		// axis further from the glass, it has to say so. An explanation that only lists
		// what it improves is an advertisement.
		const r = defaultRecipe();
		const base = buildContext(r)!;
		let checked = 0;
		for (const suspect of SUSPECTS) {
			const g = brewWrong(r, suspect, suspect.steps[suspect.steps.length - 1]);
			const reported = {
				...g.noticed(2),
				body: base.sensory.body,
				bitterness: base.sensory.bitterness
			};
			for (const e of diagnose(r, { sensory: reported })) {
				for (const key of Object.keys(reported) as SensoryKey[]) {
					const before = Math.abs(base.sensory[key] - (reported[key] as number));
					const move = [...e.explains, ...e.harms].find((m) => m.key === key);
					if (!move) continue;
					const after = Math.abs(move.would - move.observed);
					checked++;
					if (after > before + 0.1) expect(e.harms.map((h) => h.key)).toContain(key);
					if (after < before - 0.1) expect(e.explains.map((h) => h.key)).toContain(key);
				}
			}
		}
		expect(checked).toBeGreaterThan(10);
	});

	test('a suspect that was not tried cannot be offered', () => {
		const r = defaultRecipe();
		const g = brewWrong(
			r,
			SUSPECTS.find((s) => s.code === 'FERMENTED_WARM')!,
			8
		);
		const without = SUSPECTS.filter((s) => s.code !== 'FERMENTED_WARM');
		const out = diagnose(r, { sensory: g.sensory }, without);
		expect(out.map((e) => e.code)).not.toContain('FERMENTED_WARM');
	});

	test('the search is what finds it, not the shape of the test', () => {
		// The guard on the guards. If ranking by the closed gap were doing nothing, a
		// diagnoser that searched a single fixed magnitude of one wrong suspect would still
		// pass everything above. It does not: given a warm fermentation, a list containing
		// only the cold one explains none of it.
		const r = defaultRecipe();
		const g = brewWrong(
			r,
			SUSPECTS.find((s) => s.code === 'FERMENTED_WARM')!,
			8
		);
		const onlyWrong = SUSPECTS.filter((s) => s.code === 'FERMENTED_COLD');
		expect(diagnose(r, { sensory: g.sensory }, onlyWrong)).toEqual([]);
	});
});

export type { Observation };
