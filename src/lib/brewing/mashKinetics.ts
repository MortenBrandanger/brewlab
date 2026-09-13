/**
 * The mash as chemistry over time, rather than as a lookup table.
 *
 * Every homebrew calculator in existence — and every earlier version of this
 * one — answers "how fermentable is this wort" with a multiplier picked from a
 * band of mash temperatures. That is a curve fitted to other people's results.
 * It cannot tell you what a 40-minute rest at 64 °C followed by 20 at 71 °C
 * does, because nobody published a band for it.
 *
 * So this integrates the actual reaction instead. Two enzymes work on the
 * starch at once and denature while they do it:
 *
 * - **Beta-amylase** is an exo-enzyme: it walks in from the non-reducing end of
 *   a chain and clips off maltose, two glucose units at a time. It cannot start
 *   in the middle and it cannot pass a branch. Peak activity near 63 °C, and it
 *   is fragile — a few minutes above 70 °C and most of it is gone.
 * - **Alpha-amylase** is an endo-enzyme: it cuts chains at random points in the
 *   middle, which shortens them and, crucially, manufactures fresh ends for
 *   beta to work on. Peak near 71 °C and far more heat-stable.
 *
 * That division is the whole mechanism. Alone, beta is slow, because a long
 * starch chain has very few ends. Alone, alpha produces dextrins that no yeast
 * can eat. Together they are much more than the sum, which is why a step mash
 * beats either single rest, and why the answer genuinely depends on the shape
 * of the schedule rather than on its average temperature.
 *
 * The state is carried as mass fractions of the original starch:
 *
 *   S   intact, gelatinised starch
 *   D   dextrins — chains too long for yeast, including limit dextrins whose
 *       alpha-1,6 branches neither enzyme here can cut
 *   G3  maltotriose      (some yeast strains eat it, many only partly)
 *   G2  maltose          (the bulk of a normal wort)
 *   G1  glucose          (eaten first and fastest)
 *
 * Nothing here is random. Same schedule, same answer, every time — the
 * determinism the rest of the engine depends on is untouched.
 *
 * Sources for the shape of the rate and denaturation curves: Marc et al. (1983)
 * on starch hydrolysis kinetics, Muller (1991) on amylase thermostability in
 * mashing, and the half-life figures in Kunze's *Technology Brewing and
 * Malting*. The constants below are then calibrated against the recipes in
 * `simulate.test.ts`, which is what keeps the model honest.
 */

import type { MashStep } from './types';

/** Mass fractions of the original starch. They always sum to 1. */
export type SugarSpectrum = {
	/** Intact starch: unconverted, and worth no gravity at all. */
	starch: number;
	/** Dextrins. Body and sweetness in the glass; no yeast takes them. */
	dextrins: number;
	/** Maltotriose. Fermentable, but only by strains that can take it. */
	maltotriose: number;
	/** Maltose. The bulk of a normal wort. */
	maltose: number;
	/** Glucose. Eaten first. */
	glucose: number;
};

export type MashKinetics = {
	spectrum: SugarSpectrum;
	/**
	 * The share of the starch that became sugar of any kind. Anything still
	 * `starch` at the end never made it into the kettle as extract.
	 */
	conversion: number;
	/**
	 * The highest attenuation this wort could reach with a yeast that eats
	 * everything it is able to, 0–1. What the strain then actually manages is
	 * fermentation's problem, not the mash's.
	 */
	attenuationLimit: number;
	/** Enzyme surviving at the end, as a fraction of what went in. */
	enzymesLeft: { alpha: number; beta: number };
	/** One sample per minute, for drawing what happened. */
	curve: { minute: number; tempC: number; spectrum: SugarSpectrum }[];
};

/* -------------------------------------------------------------------------- */
/* Enzyme behaviour                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Relative activity against temperature: a skewed bell, because an enzyme
 * slows gently below its optimum and falls off a cliff above it.
 *
 * This is activity only. Destruction is handled separately by `decayPerMin`,
 * and keeping them apart is what lets a hot rest be briefly very productive
 * before the enzyme driving it is gone.
 */
function activity(tempC: number, optimum: number, spread: number): number {
	const d = tempC - optimum;
	// Wider tolerance below the optimum than above it.
	const scaled = d < 0 ? d / spread : (d / spread) * 1.6;
	return Math.exp(-0.5 * scaled * scaled);
}

/**
 * First-order denaturation, from published half-lives.
 *
 * Beta-amylase: roughly 40 min at 65 °C, 15 at 67.5, 5 at 70, under a minute
 * at 75. Alpha-amylase: about two hours at 65 °C, 40 min at 70, 15 at 75 and a
 * couple of minutes at 80.
 *
 * A thick mash protects both. That is real — less water per kilo of grain
 * means more dissolved solids stabilising the protein — and it is why the
 * thickness slider has to be part of this and not a separate fudge factor.
 */
function decayPerMin(tempC: number, halfLifeAt65: number, steepness: number, shield: number) {
	const halfLife = halfLifeAt65 * Math.pow(2, -(tempC - 65) / steepness) * shield;
	return Math.LN2 / Math.max(0.05, halfLife);
}

/* -------------------------------------------------------------------------- */
/* Rate constants                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Calibrated so the canonical schedules land where brewing experience puts
 * them: a single infusion at 66 °C for an hour reaches an attenuation limit
 * near 80%, a long rest at 63 °C near 86%, a hot one at 71 °C near 68%, and a
 * step mash beats any of them.
 */
const K = {
	/** Alpha cutting intact starch into dextrins. */
	alphaOnStarch: 0.115,
	/** Alpha cutting dextrins shorter, releasing small sugars as it goes. */
	alphaOnDextrin: 0.085,
	/** Beta clipping maltose off intact starch. Slow: few ends to start on. */
	betaOnStarch: 0.02,
	/** Beta clipping maltose off dextrins. Fast: alpha has made the ends. */
	betaOnDextrin: 0.09,
	/** What alpha's cuts on a dextrin yield, the rest staying dextrin. */
	alphaYield: { glucose: 0.08, maltose: 0.24, maltotriose: 0.14 },
	/** The branched cores beta can never reach, as a floor on dextrins. */
	limitDextrinFloor: 0.125
} as const;

const BETA = { optimum: 63, spread: 11, halfLifeAt65: 40, steepness: 1.67 } as const;
const ALPHA = { optimum: 71.5, spread: 9.5, halfLifeAt65: 120, steepness: 6.5 } as const;

/** Below this the starch has not gelatinised and no enzyme can reach it. */
const GELATINISATION_C = 58;
/** Above this nothing survives long enough to matter. */
const DEAD_C = 82;

/* -------------------------------------------------------------------------- */
/* The model                                                                  */
/* -------------------------------------------------------------------------- */

export type MashKineticsInput = {
	steps: MashStep[];
	/** Litres of water per kilogram of grain. */
	thicknessLPerKg: number;
	/** Mash pH. Both enzymes work best between about 5.2 and 5.6. */
	mashPh: number;
	/**
	 * Diastatic power of the grist in degrees Lintner. Around 35 is the floor
	 * for a grist to convert itself; a pilsner-heavy one runs past 100 and
	 * converts in a fraction of the time.
	 */
	diastaticPowerLintner: number;
};

const EMPTY: SugarSpectrum = {
	starch: 1,
	dextrins: 0,
	maltotriose: 0,
	maltose: 0,
	glucose: 0
};

export function simulateMash(input: MashKineticsInput): MashKinetics {
	const { steps, thicknessLPerKg, mashPh, diastaticPowerLintner } = input;

	/**
	 * How much enzyme went in, relative to an ordinary pale-malt grist at
	 * 60 °Lintner. Saturating rather than linear: doubling the enzyme does not
	 * halve the time, because past a point the starch itself is the limit.
	 */
	const load = Math.sqrt(Math.max(0, diastaticPowerLintner) / 60);

	/**
	 * pH multiplier. Both enzymes peak around 5.4 and lose perhaps a fifth of
	 * their rate by 5.8, which is roughly what the mash pH fault warns about.
	 */
	const phFactor = Math.exp(-0.5 * Math.pow((mashPh - 5.4) / 0.42, 2));

	/** A thick mash shields the enzymes; a thin one leaves them exposed. */
	const shield = 1 + (3 - Math.min(5, Math.max(1.5, thicknessLPerKg))) * 0.11;

	let s = { ...EMPTY };
	let alpha = 1;
	let beta = 1;
	const curve: MashKinetics['curve'] = [{ minute: 0, tempC: steps[0]?.tempC ?? 0, spectrum: s }];

	/** A minute is short enough for this system; sub-stepping keeps it stable. */
	const SUBSTEPS = 6;
	const dt = 1 / SUBSTEPS;
	let minute = 0;

	for (const step of steps) {
		const tempC = step.tempC;
		const minutes = Math.max(0, Math.round(step.minutes));
		const gelatinised = tempC >= GELATINISATION_C && tempC <= DEAD_C;
		const aAct = gelatinised ? activity(tempC, ALPHA.optimum, ALPHA.spread) : 0;
		const bAct = gelatinised ? activity(tempC, BETA.optimum, BETA.spread) : 0;
		const aDecay = decayPerMin(tempC, ALPHA.halfLifeAt65, ALPHA.steepness, shield);
		const bDecay = decayPerMin(tempC, BETA.halfLifeAt65, BETA.steepness, shield);

		for (let m = 0; m < minutes; m++) {
			for (let k = 0; k < SUBSTEPS; k++) {
				const a = alpha * aAct * load * phFactor;
				const b = beta * bAct * load * phFactor;

				// Alpha opens the starch up and keeps chopping what it made.
				const aS = K.alphaOnStarch * a * s.starch;
				const aD = K.alphaOnDextrin * a * Math.max(0, s.dextrins - K.limitDextrinFloor);
				// Beta works the ends: slowly on intact starch, quickly on dextrins.
				const bS = K.betaOnStarch * b * s.starch;
				const bD = K.betaOnDextrin * b * Math.max(0, s.dextrins - K.limitDextrinFloor);

				const fromStarch = Math.min(s.starch, (aS + bS) * dt);
				const aShare = aS + bS > 0 ? aS / (aS + bS) : 0;
				const aFromStarch = fromStarch * aShare;
				const bFromStarch = fromStarch * (1 - aShare);

				const dextrinEaten = Math.min(
					Math.max(0, s.dextrins - K.limitDextrinFloor),
					(aD + bD) * dt
				);
				const aFromDextrin = aD + bD > 0 ? dextrinEaten * (aD / (aD + bD)) : 0;
				const bFromDextrin = dextrinEaten - aFromDextrin;

				const y = K.alphaYield;
				const alphaSmall = aFromDextrin * (y.glucose + y.maltose + y.maltotriose);

				s = {
					starch: s.starch - fromStarch,
					dextrins: s.dextrins + aFromStarch - dextrinEaten + (aFromDextrin - alphaSmall),
					glucose: s.glucose + aFromDextrin * y.glucose,
					maltose: s.maltose + bFromStarch + bFromDextrin + aFromDextrin * y.maltose,
					maltotriose: s.maltotriose + aFromDextrin * y.maltotriose
				};

				alpha *= Math.exp(-aDecay * dt);
				beta *= Math.exp(-bDecay * dt);
			}
			minute++;
			curve.push({ minute, tempC, spectrum: s });
		}
	}

	const converted = 1 - s.starch;
	const sugars = s.glucose + s.maltose + s.maltotriose;
	const extract = sugars + s.dextrins;

	return {
		spectrum: s,
		conversion: converted,
		/*
		 * Unconverted starch never reaches the kettle, so it is not part of what
		 * the yeast is offered. The limit is measured against the extract that
		 * actually got there.
		 */
		attenuationLimit: extract > 0 ? sugars / extract : 0,
		enzymesLeft: { alpha, beta },
		curve
	};
}
