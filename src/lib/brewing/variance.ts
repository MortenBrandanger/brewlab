/**
 * How reliably this recipe comes out, and what makes it unreliable.
 *
 * A brewer with twenty years at the kettle, asked what this simulator was
 * missing, said: *"In twenty years I have hit my target exactly maybe a dozen
 * times. The whole texture of the mash hour is — I aimed for 66, I got 64.5,
 * do I fix it or live with it."*
 *
 * Every brewing calculator in existence gives one number per recipe, as though
 * the brew day were a spreadsheet. It is not. You miss the mash temperature,
 * your efficiency is three points off what it was last time, the boil runs
 * harder than you expected, the fermenting cupboard swings a degree overnight.
 * A good recipe is not one whose single predicted number is right; it is one
 * that survives all of that. And a recipe can be fragile in a way its headline
 * numbers will never show.
 *
 * So this runs the whole engine a few hundred times over a distribution of
 * realistic execution error, and reports the spread. Two questions come out of
 * it that nobody could answer before:
 *
 * 1. **How wide is the range?** "Nine times in ten this lands between 5.1 and
 *    5.6% ABV" says something a single figure of 5.35% cannot.
 * 2. **What is it most sensitive to?** The spread is decomposed against each
 *    source, so the answer is not "this is fragile" but "this is fragile
 *    *because of the mash temperature*, and that is the thing to control".
 *
 * It stays deterministic. The random numbers come from a small seeded
 * generator, and the seed is derived from the recipe itself, so the same
 * recipe always produces the same spread — no flicker, no run-to-run drift,
 * and the engine's guarantee that the same input gives the same output holds
 * exactly as before.
 */

import type { Recipe } from './types';
import { simulate } from './simulate';

export type VarianceSource =
	'mashTemp' | 'efficiency' | 'kettleVolume' | 'boilOff' | 'fermentTemp' | 'mashPh';

export type Spread = {
	/** The recipe exactly as written, with nothing gone wrong. */
	nominal: number;
	/** The middle of what actually happens. */
	median: number;
	/** Nine runs in ten land between these. */
	low: number;
	high: number;
};

export type VarianceReport = {
	runs: number;
	abv: Spread;
	fg: Spread;
	og: Spread;
	ibu: Spread;
	ebc: Spread;
	/** Share of runs that stayed inside the target style, when there is one. */
	inStyle?: number;
	/**
	 * What the spread is made of, strongest first. Each weight is that source's
	 * share of the variation in the finished beer, so they sum to 1.
	 */
	sensitivity: { source: VarianceSource; label: string; weight: number }[];
	/** 0–10. How far the beer moves when the brew day does not go to plan. */
	fragility: number;
};

/* -------------------------------------------------------------------------- */
/* Deterministic randomness                                                   */
/* -------------------------------------------------------------------------- */

/** mulberry32: small, fast, and good enough for sampling a normal. */
function rng(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Box–Muller, clipped at three sigma so one freak run cannot own the range. */
function normal(next: () => number): number {
	const u = Math.max(1e-9, next());
	const v = next();
	const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
	return Math.max(-3, Math.min(3, z));
}

/** A seed from the recipe, so the same beer always gets the same spread. */
function seedFor(recipe: Recipe): number {
	const text = JSON.stringify([
		recipe.batchVolumeL,
		recipe.preBoilVolumeL,
		recipe.boilTimeMin,
		recipe.efficiencyPct,
		recipe.fermentables.map((f) => [f.fermentableId, f.weightKg]),
		recipe.hops.map((h) => [h.hopId, h.grams, h.time, h.use]),
		recipe.mash.steps.map((s) => [s.tempC, s.minutes]),
		recipe.fermentation.yeastId,
		recipe.fermentation.steps.map((s) => [s.tempC, s.days])
	]);
	let h = 2166136261;
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

/* -------------------------------------------------------------------------- */
/* What actually goes wrong                                                   */
/* -------------------------------------------------------------------------- */

/**
 * One standard deviation of ordinary execution error, from what homebrewers
 * actually report rather than from what they aim for.
 *
 * The mash temperature is the big one: a degree either way is a good day, and
 * a thin mash in a cold tun is worse than that. Efficiency moves with the
 * crush and the sparge and is the reason two brews from one recipe sheet come
 * out at different gravities.
 */
const SIGMA: Record<VarianceSource, number> = {
	/** Degrees celsius on every mash rest. */
	mashTemp: 1.1,
	/** Percentage points of brewhouse efficiency. */
	efficiency: 3,
	/** Litres into the kettle. */
	kettleVolume: 0.7,
	/** Litres of boil-off over the whole boil. */
	boilOff: 0.8,
	/** Degrees celsius on the fermentation, wider without a chamber. */
	fermentTemp: 1.2,
	/** pH units: the gap between a water report and the actual liquor. */
	mashPh: 0.08
};

const LABEL: Record<VarianceSource, string> = {
	mashTemp: 'Hitting the mash temperature',
	efficiency: 'Brewhouse efficiency',
	kettleVolume: 'Volume into the kettle',
	boilOff: 'How hard it boiled',
	fermentTemp: 'Fermentation temperature',
	mashPh: 'Mash pH'
};

type Draw = Record<VarianceSource, number>;

/** Apply one draw of execution error to a recipe. */
function perturb(recipe: Recipe, draw: Draw): Recipe {
	const preBoil = Math.max(1, recipe.preBoilVolumeL + draw.kettleVolume * SIGMA.kettleVolume);
	const boilOffShift = draw.boilOff * SIGMA.boilOff;
	return {
		...recipe,
		preBoilVolumeL: preBoil,
		batchVolumeL: Math.max(0.5, recipe.batchVolumeL - boilOffShift),
		efficiencyPct: Math.max(20, recipe.efficiencyPct + draw.efficiency * SIGMA.efficiency),
		mash: {
			...recipe.mash,
			steps: recipe.mash.steps.map((s) => ({
				...s,
				// A mash-out is a boil-water addition and lands where it lands; the
				// rests are the ones you have to hit.
				tempC: s.tempC >= 75 ? s.tempC : s.tempC + draw.mashTemp * SIGMA.mashTemp
			}))
		},
		water: {
			...recipe.water,
			// Standing in for every reason the real liquor is not the report.
			lacticAcidMl: Math.max(0, recipe.water.lacticAcidMl - draw.mashPh * SIGMA.mashPh * 16)
		},
		fermentation: {
			...recipe.fermentation,
			steps: recipe.fermentation.steps.map((s) => ({
				...s,
				tempC: s.tempC + draw.fermentTemp * SIGMA.fermentTemp
			}))
		}
	};
}

const SOURCES: VarianceSource[] = [
	'mashTemp',
	'efficiency',
	'kettleVolume',
	'boilOff',
	'fermentTemp',
	'mashPh'
];

/* -------------------------------------------------------------------------- */
/* The report                                                                 */
/* -------------------------------------------------------------------------- */

function spreadOf(nominal: number, samples: number[]): Spread {
	const sorted = [...samples].sort((a, b) => a - b);
	const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
	return { nominal, median: at(0.5), low: at(0.05), high: at(0.95) };
}

export function analyseVariance(recipe: Recipe, runs = 240): VarianceReport {
	const nominal = simulate(recipe);
	const next = rng(seedFor(recipe));

	const draws: Draw[] = [];
	const abv: number[] = [];
	const fg: number[] = [];
	const og: number[] = [];
	const ibu: number[] = [];
	const ebc: number[] = [];
	let inStyle = 0;

	for (let i = 0; i < runs; i++) {
		const draw = Object.fromEntries(SOURCES.map((s) => [s, normal(next)])) as Draw;
		draws.push(draw);
		const result = simulate(perturb(recipe, draw));
		abv.push(result.metrics.abv);
		fg.push(result.metrics.fg);
		og.push(result.metrics.og);
		ibu.push(result.metrics.ibu);
		ebc.push(result.metrics.ebc);
		if (result.targetStyle && result.targetStyle.match >= 70) inStyle++;
	}

	/*
	 * Which source moved the beer most.
	 *
	 * The correlation between each input's draw and the resulting ABV, squared
	 * so it reads as a share of the variation rather than a direction. ABV is
	 * the stand-in for the beer as a whole because everything upstream — the
	 * mash, the efficiency, the volumes, the fermentation — ends up in it.
	 */
	const sensitivity = SOURCES.map((source) => ({
		source,
		label: LABEL[source],
		weight: Math.pow(
			correlation(
				draws.map((d) => d[source]),
				abv
			),
			2
		)
	}));
	const total = sensitivity.reduce((sum, s) => sum + s.weight, 0);
	const normalised = sensitivity
		.map((s) => ({ ...s, weight: total > 0 ? s.weight / total : 0 }))
		.sort((a, b) => b.weight - a.weight);

	const abvSpread = spreadOf(nominal.metrics.abv, abv);
	/*
	 * Fragility is the width of the ABV range against the beer's own strength,
	 * so a tenth of a percent either side of a 4% mild counts for as much as a
	 * quarter either side of a 10% stout.
	 */
	const relative = abvSpread.median > 0 ? (abvSpread.high - abvSpread.low) / abvSpread.median : 0;

	return {
		runs,
		abv: abvSpread,
		fg: spreadOf(nominal.metrics.fg, fg),
		og: spreadOf(nominal.metrics.og, og),
		ibu: spreadOf(nominal.metrics.ibu, ibu),
		ebc: spreadOf(nominal.metrics.ebc, ebc),
		inStyle: recipe.targetStyleId ? inStyle / runs : undefined,
		sensitivity: normalised,
		fragility: Math.min(10, relative * 30)
	};
}

function correlation(xs: number[], ys: number[]): number {
	const n = Math.min(xs.length, ys.length);
	if (n < 2) return 0;
	const mx = xs.reduce((s, v) => s + v, 0) / n;
	const my = ys.reduce((s, v) => s + v, 0) / n;
	let num = 0;
	let dx = 0;
	let dy = 0;
	for (let i = 0; i < n; i++) {
		const a = xs[i] - mx;
		const b = ys[i] - my;
		num += a * b;
		dx += a * a;
		dy += b * b;
	}
	const den = Math.sqrt(dx * dy);
	return den > 0 ? num / den : 0;
}
