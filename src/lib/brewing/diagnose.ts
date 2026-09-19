/**
 * The model, run backwards.
 *
 * Everything else here goes one way: a recipe becomes a wort becomes a beer, and
 * `computeFindings` reports what went wrong with it. But nobody stands in their kitchen
 * holding a recipe and wondering what it will taste like — they stand there holding a
 * glass that came out wrong, and the recipe on the page says it should have been fine.
 * What they want to know is what they actually did, and that is the one question a
 * forward model cannot answer by being read forwards.
 *
 * It can answer it by being run repeatedly. A brew day has a handful of ways of drifting
 * from what was written down, each of them physical and each of them something the
 * engine already models: the mash lands hotter than the thermometer was asked for, the
 * fermenter sits in a warm room, the bleach is not rinsed off, the transfer splashes.
 * Apply one, run the model again, and see whether the beer it predicts is closer to the
 * beer in the glass. The suspect that closes most of the gap is the explanation.
 *
 * Two things this must not do, and they are the whole difficulty:
 *
 * It must not be graded on the outcome alone. A suspect that improves the fit by moving
 * an axis the drinker never mentioned has explained nothing; it has found a coincidence.
 * So the distance is measured only over what was actually reported, and any suspect that
 * drags a reported axis further from the truth is marked for it rather than rewarded.
 *
 * And it must be willing to say it does not know. A brew day has more ways of going
 * wrong than are listed here, and something that explains a tenth of the gap is not an
 * explanation. Below `MIN_CLOSES` it returns nothing, which is the honest answer and the
 * one a brewer can act on.
 */

import { buildContext, recipeSrm } from './simulate';
import { computeFindings } from './faults';
import { appearanceOf } from './appearance';
import type { Recipe, SensoryKey, SensoryVector } from './types';

/** What the beer in the glass was actually like. */
export type Observation = {
	/**
	 * The axes the drinker noticed, on the same 0-10 scale the tasting panel uses. Only
	 * what was noticed: an axis left out is not a claim that it was correct, it is a
	 * claim that nobody looked, and the two must not be confused.
	 */
	sensory?: Partial<SensoryVector>;
	/** Anything nameable, by the engine's own fault codes. */
	faults?: string[];
	/**
	 * What it looked like in the glass, 0-1 as the appearance model scales it.
	 *
	 * A third channel because the first two cannot see everything. Measured across the
	 * suspects below, four of thirteen move no sensory axis at all and two of those move
	 * no fault code either — skipping the vorlauf is worth 0.9 of astringency risk
	 * against a fault threshold of 4, so it never trips one, and 0.14 of haze, which is
	 * the only place it is visible. A brewer who poured a beer that would not clear has
	 * observed something real, and a diagnosis that cannot take it is deaf on that side.
	 */
	haze?: number;
};

export type Suspect = {
	code: string;
	/** What happened, in the brewer's words. */
	label: string;
	/** What you would ask them to confirm it. The answer is theirs, not the model's. */
	question: string;
	unit: string;
	/**
	 * Magnitudes to try, smallest first. Occam lives in this order and in the penalty
	 * below: a small mistake that explains most of the gap beats a large one that
	 * explains all of it, because large mistakes get noticed on the day.
	 */
	steps: number[];
	apply(recipe: Recipe, magnitude: number): Recipe;
};

export type AxisMove = {
	key: SensoryKey;
	/** what the recipe as written predicts */
	predicted: number;
	/** what this suspect would predict instead */
	would: number;
	/** what was in the glass */
	observed: number;
};

export type Explanation = {
	code: string;
	label: string;
	question: string;
	magnitude: number;
	unit: string;
	/** Share of the reported gap this closes, 0-1. */
	closes: number;
	/** Ranking value: `closes` less the penalty for how large a mistake it supposes. */
	score: number;
	/** Reported axes it moves toward the glass, most improved first. */
	explains: AxisMove[];
	/** Reported axes it moves away from. An explanation with these is a worse one. */
	harms: AxisMove[];
	/** Fault codes the drinker named that this suspect would produce and the recipe does not. */
	faultsExplained: string[];
};

const SENSORY_KEYS: SensoryKey[] = [
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

/**
 * What a drinker can actually put a name to, in their words rather than the model's.
 *
 * Here rather than in the component because `faults.ts` already carries the lesson: the
 * first taster kept its own thresholds and put butterscotch in the tasting note one
 * paragraph under "no significant faults were found". Two sets of numbers for one
 * question is one set too many, and a list of tasteable faults held in a Svelte file
 * while the codes live here is the same shape of mistake.
 *
 * Eight, because eight is what `FAULT_THRESHOLD` covers — the risks the engine carries
 * all the way to something a person would notice in the glass.
 */
export const TASTEABLE: { code: string; label: string; hint: string }[] = [
	{
		code: 'DIACETYL_RISK',
		label: 'Butterscotch or butter',
		hint: 'Slick on the tongue, like the butter on cinema popcorn.'
	},
	{
		code: 'OXIDATION_RISK',
		label: 'Wet cardboard, or sherry',
		hint: 'Papery and stale, or a sweet sherry note in a beer that should be fresh.'
	},
	{
		code: 'CHLOROPHENOL',
		label: 'Plaster, TCP or a swimming pool',
		hint: 'Medicinal and plastic, and it stays at the back of the throat.'
	},
	{
		code: 'FUSEL_RISK',
		label: 'Solvent or nail varnish',
		hint: 'A burn in the throat out of all proportion to the strength.'
	},
	{
		code: 'DMS_RISK',
		label: 'Sweetcorn or cooked vegetable',
		hint: 'Tinned corn, or tomato sauce.'
	},
	{
		code: 'ASTRINGENCY_RISK',
		label: 'Drying, with a grip like strong tea',
		hint: 'Puckering, the way over-brewed tea or grape skins are.'
	},
	{
		code: 'INFECTION_RISK',
		label: 'Sour or farmyard, and not on purpose',
		hint: 'Tart, or a horse-blanket funk you did not ask for.'
	},
	{
		code: 'DRY_HOP_TOO_LONG',
		label: 'Grass or hay',
		hint: 'Green and vegetal, like a cut lawn.'
	}
];

/** Below this a suspect is a coincidence, not an explanation, and is not offered. */
export const MIN_CLOSES = 0.15;
/**
 * How much a large supposed mistake is penalised against a small one, as a share of the
 * gap closed. At 0.18 a suspect has to close about a fifth more of the gap to justify
 * being twice the size, which matches the fact that big mistakes usually get noticed on
 * the day and small ones do not.
 */
const SIZE_PENALTY = 0.18;

/**
 * A copy that does not care what it was handed.
 *
 * This was `structuredClone`, which is correct and fails in the app: the recipe the
 * component passes in is Svelte reactive state, and a `$state` proxy cannot be cloned
 * structurally — `DataCloneError` on the first click. The tests never saw it because
 * they hand over plain objects from `defaultRecipe()`, so two hundred and thirty-two of
 * them were green while the feature threw. It took opening it in a browser, which is
 * what CLAUDE.md says is the only review here that has ever found anything.
 *
 * The obvious repair is `$state.snapshot`, and it is the wrong one: this engine is
 * framework-free TypeScript and importing Svelte into it to satisfy one caller makes
 * every other caller pay. A recipe is numbers, strings, booleans and arrays of them —
 * no dates, no maps, nothing with identity — so a JSON round trip both copies it and
 * strips whatever proxy it arrived wrapped in. Absent optional fields stay absent,
 * because a key whose value is undefined is dropped, which is what they mean anyway.
 */
const clone = (r: Recipe): Recipe => JSON.parse(JSON.stringify(r)) as Recipe;

/**
 * The ways a brew day drifts from the page.
 *
 * Every one of these is a real thing that happens in a kitchen and a channel the engine
 * already models — there is no new physics here, only the existing physics asked a
 * different question. Ordered roughly by how often they catch people out.
 */
export const SUSPECTS: Suspect[] = [
	{
		code: 'MASH_LANDED_HOT',
		label: 'The mash landed hotter than the recipe asked for',
		question: 'What did the thermometer actually read after the grain went in?',
		unit: '°C',
		steps: [1, 2, 3, 4, 6],
		apply: (r, m) => {
			const next = clone(r);
			const first = next.mash.steps.find((s) => s.kind === 'beta' || s.kind === 'alpha');
			next.mash.landedTempC = (first?.tempC ?? 66) + m;
			return next;
		}
	},
	{
		code: 'MASH_LANDED_COOL',
		label: 'The mash landed cooler than the recipe asked for',
		question: 'What did the thermometer actually read after the grain went in?',
		unit: '°C',
		steps: [1, 2, 3, 4, 6],
		apply: (r, m) => {
			const next = clone(r);
			const first = next.mash.steps.find((s) => s.kind === 'beta' || s.kind === 'alpha');
			next.mash.landedTempC = (first?.tempC ?? 66) - m;
			return next;
		}
	},
	{
		code: 'FERMENTED_WARM',
		label: 'The fermenter ran warmer than the plan',
		question: 'Where did it actually stand, and how warm did that room get?',
		unit: '°C',
		steps: [2, 4, 6, 8],
		apply: (r, m) => {
			const next = clone(r);
			next.fermentation.steps = next.fermentation.steps.map((s) => ({ ...s, tempC: s.tempC + m }));
			return next;
		}
	},
	{
		code: 'FERMENTED_COLD',
		label: 'The fermenter ran colder than the plan',
		question: 'Where did it actually stand, and how cold did that room get at night?',
		unit: '°C',
		steps: [2, 4, 6],
		apply: (r, m) => {
			const next = clone(r);
			next.fermentation.steps = next.fermentation.steps.map((s) => ({
				...s,
				tempC: Math.max(0, s.tempC - m)
			}));
			return next;
		}
	},
	{
		code: 'UNDER_PITCHED',
		label: 'Less yeast went in than the recipe assumes',
		question: 'One packet or two, and how old was it?',
		unit: 'step',
		steps: [1],
		apply: (r) => {
			const next = clone(r);
			next.fermentation.pitchRate = 'under';
			return next;
		}
	},
	{
		code: 'PACKAGED_EARLY',
		label: 'It came off the yeast before it had finished',
		question: 'How many days from pitching to packaging, and was the gravity stable?',
		unit: 'days',
		steps: [4, 7, 10],
		apply: (r, m) => {
			const next = clone(r);
			// Taken off the end of the whole schedule rather than off the last step. Cutting
			// only the last one left the ten-day primary standing, so a fourteen-day plan
			// came off the yeast on day ten and the model rightly said nothing was wrong —
			// which is true, and not what a brewer who bottled early actually did.
			let left = m;
			for (let i = next.fermentation.steps.length - 1; i >= 0 && left > 0; i--) {
				const s = next.fermentation.steps[i];
				const take = Math.min(left, Math.max(0, s.days - 1));
				next.fermentation.steps[i] = { ...s, days: s.days - take };
				left -= take;
			}
			return next;
		}
	},
	{
		code: 'BLEACH_NOT_RINSED',
		label: 'Bleach was used and the rinse was ordinary tap water',
		question: 'What did you sanitise with, and what did you rinse it with?',
		unit: '',
		steps: [1],
		apply: (r) => {
			const next = clone(r);
			next.chill = { ...next.chill, sanitation: 'bleach' };
			return next;
		}
	},
	{
		code: 'CARELESS_TRANSFER',
		label: 'The cold side picked up air',
		question: 'Did the beer splash on its way into the fermenter or the bottles?',
		unit: '',
		steps: [1],
		apply: (r) => {
			const next = clone(r);
			next.chill = { ...next.chill, transferQuality: 'careless' };
			return next;
		}
	},
	{
		code: 'SLOW_CHILL',
		label: 'The wort took much longer to come down than planned',
		question: 'How long from flameout to pitching temperature?',
		unit: 'min',
		steps: [20, 45, 90],
		apply: (r, m) => {
			const next = clone(r);
			next.chill = { ...next.chill, minutes: next.chill.minutes + m };
			return next;
		}
	},
	{
		code: 'SHORT_BOIL',
		label: 'The boil was shorter or lazier than the recipe',
		question: 'How long was it at a genuine rolling boil, lid off?',
		unit: 'min',
		steps: [10, 20, 30],
		apply: (r, m) => {
			const next = clone(r);
			next.boilTimeMin = Math.max(5, next.boilTimeMin - m);
			return next;
		}
	},
	{
		code: 'NO_VORLAUF',
		label: 'The cloudy first runnings went straight into the kettle',
		question: 'Did you run the first litres back over the grain bed?',
		unit: '',
		steps: [1],
		apply: (r) => {
			const next = clone(r);
			next.mash = { ...next.mash, vorlauf: false };
			return next;
		}
	},
	{
		code: 'LONG_DRY_HOP',
		label: 'The dry hops sat in far longer than the recipe',
		question: 'How many days were the hops in contact before packaging?',
		unit: 'days',
		steps: [4, 8, 14],
		apply: (r, m) => {
			const next = clone(r);
			// `time` is days of contact for a dry hop, minutes for everything else
			next.hops = next.hops.map((h) => (h.use === 'dryHop' ? { ...h, time: h.time + m } : h));
			return next;
		}
	},
	{
		code: 'LOW_EFFICIENCY',
		label: 'Less sugar made it into the kettle than assumed',
		question: 'What was the gravity into the fermenter against what the recipe said?',
		unit: '%',
		steps: [5, 10, 15],
		apply: (r, m) => {
			const next = clone(r);
			next.efficiencyPct = Math.max(30, next.efficiencyPct - m);
			return next;
		}
	}
];

/** Distance over the reported axes only, because those are the only claims made. */
function gap(predicted: SensoryVector, observed: Partial<SensoryVector>): number {
	let total = 0;
	for (const key of SENSORY_KEYS) {
		const o = observed[key];
		if (o === undefined) continue;
		total += Math.abs(predicted[key] - o);
	}
	return total;
}

/**
 * Haze on the same footing as a sensory axis.
 *
 * Scaled by ten because haze runs 0-1 and the tasting axes run 0-10, and a gap is a sum
 * over both. Without it a beer that would not clear counts for a tenth of a point of
 * sweetness, which is to say it counts for nothing.
 */
function hazeOf(recipe: Recipe): number {
	const ctx = buildContext(recipe);
	if (!ctx) return 0;
	return appearanceOf(ctx, recipeSrm(recipe)).haze;
}

/**
 * What the recipe as written says, against what was in the glass.
 *
 * Returned on its own because it is worth seeing before any suspect is: a gap of nearly
 * nothing means the model and the beer already agree, and whatever disappointed the
 * brewer is not a mistake on the day but the recipe doing what it says.
 */
export function baselineGap(recipe: Recipe, observation: Observation): number | undefined {
	const ctx = buildContext(recipe);
	if (!ctx) return undefined;
	const h = observation.haze === undefined ? 0 : Math.abs(hazeOf(recipe) - observation.haze) * 10;
	return gap(ctx.sensory, observation.sensory ?? {}) + h;
}

/**
 * What would explain the beer in the glass, most likely first.
 *
 * Empty is a real answer: it means nothing in the list of ordinary mistakes accounts for
 * what was tasted, and the next move is a question rather than a fix.
 */
export function diagnose(
	recipe: Recipe,
	observation: Observation,
	suspects: Suspect[] = SUSPECTS
): Explanation[] {
	const base = buildContext(recipe);
	if (!base) return [];
	const reported = observation.sensory ?? {};
	const reportedKeys = SENSORY_KEYS.filter((k) => reported[k] !== undefined);
	const wantedFaults = new Set(observation.faults ?? []);
	const baseFaults = new Set(computeFindings(base).map((f) => f.code));
	const hazeGap = (r: Recipe) =>
		observation.haze === undefined ? 0 : Math.abs(hazeOf(r) - observation.haze) * 10;
	const baseGap = gap(base.sensory, reported) + hazeGap(recipe);

	const out: Explanation[] = [];
	for (const suspect of suspects) {
		let best: Explanation | null = null;
		const largest = Math.max(...suspect.steps);
		for (const magnitude of suspect.steps) {
			const candidate = suspect.apply(recipe, magnitude);
			const ctx = buildContext(candidate);
			if (!ctx) continue;

			const faultsExplained = [...wantedFaults].filter(
				(code) => !baseFaults.has(code) && computeFindings(ctx).some((f) => f.code === code)
			);

			// No sensory reported at all: the fault codes are the whole claim.
			const closes =
				reportedKeys.length === 0 && observation.haze === undefined
					? wantedFaults.size > 0
						? faultsExplained.length / wantedFaults.size
						: 0
					: baseGap <= 0
						? 0
						: (baseGap - (gap(ctx.sensory, reported) + hazeGap(candidate))) / baseGap;

			const explains: AxisMove[] = [];
			const harms: AxisMove[] = [];
			for (const key of reportedKeys) {
				const observed = reported[key] as number;
				const predicted = base.sensory[key];
				const would = ctx.sensory[key];
				const before = Math.abs(predicted - observed);
				const after = Math.abs(would - observed);
				const move: AxisMove = { key, predicted, would, observed };
				// A tenth of a point on a ten-point scale is not a movement, it is float noise.
				if (after < before - 0.1) explains.push(move);
				else if (after > before + 0.1) harms.push(move);
			}
			explains.sort(
				(a, b) =>
					Math.abs(b.predicted - b.observed) -
					Math.abs(b.would - b.observed) -
					(Math.abs(a.predicted - a.observed) - Math.abs(a.would - a.observed))
			);

			const score =
				closes +
				(wantedFaults.size > 0 ? (faultsExplained.length / wantedFaults.size) * 0.5 : 0) -
				SIZE_PENALTY * (magnitude / largest);

			if (!best || score > best.score) {
				best = {
					code: suspect.code,
					label: suspect.label,
					question: suspect.question,
					magnitude,
					unit: suspect.unit,
					closes,
					score,
					explains,
					harms,
					faultsExplained
				};
			}
		}
		if (best && (best.closes >= MIN_CLOSES || best.faultsExplained.length > 0)) out.push(best);
	}

	return out.sort((a, b) => b.score - a.score);
}
