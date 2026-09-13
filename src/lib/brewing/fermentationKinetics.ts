/**
 * Fermentation as a population of yeast eating a wort, hour by hour.
 *
 * The model this replaces multiplied a strain's nominal attenuation by a
 * handful of factors — one for the mash, one for pitch rate, one for
 * temperature — and then compressed the top end because the multipliers
 * overshot. Every one of those factors was a separate guess at the same
 * underlying thing, and none of them could explain why the guesses were
 * related. Esters, fusels and diacetyl were three more formulas alongside,
 * each with its own temperature term.
 *
 * They are not separate. They all fall out of one fact: **yeast makes flavour
 * while it is growing, not while it is fermenting.**
 *
 * Esters come from acetyl-CoA and alcohol via an enzyme the cell expresses
 * during growth. Fusel alcohols come from amino acids consumed to build new
 * cells. Diacetyl is spilled from the pathway that makes valine, which the
 * cell only needs while dividing. So anything that makes the yeast grow more
 * — underpitching, a warm start, a big wort — raises all three together, and
 * the three rules of thumb every brewer knows turn out to be one rule.
 *
 * What is modelled here:
 *
 * - **Growth** toward a carrying capacity set by how much sugar there is,
 *   starting from whatever was pitched. Underpitch and the yeast has more
 *   generations to run before it gets there, which is the whole mechanism.
 * - **Sugars taken in order.** Glucose first, and while glucose is present it
 *   represses the machinery for maltose — a real regulatory effect, not a
 *   convenience. Maltotriose last, and only by strains that can carry it,
 *   which is the single biggest reason two yeasts finish the same wort at
 *   different gravities.
 * - **Flocculation**, as yeast dropping out of suspension once the sugar runs
 *   low. A high-flocculating strain in a cold room can drop out before it has
 *   finished, which is a stall with a cause rather than a flag.
 * - **Diacetyl produced during growth and reabsorbed afterwards** — but only
 *   by yeast still in suspension. Crash it cold too early and the butterscotch
 *   stays in the beer, which is exactly what the warning on the cold-crash
 *   question has always claimed and could not previously demonstrate.
 * - **Ethanol inhibition** as the beer approaches the strain's tolerance.
 *
 * Deterministic throughout. The same schedule gives the same beer.
 */

import type { SugarSpectrum } from './mashKinetics';
import type { PitchRate, Yeast } from './types';

export type FermentationDay = {
	day: number;
	tempC: number;
	/** Gravity points still in solution, fermentable and not. */
	points: number;
	/** Yeast in suspension, relative to a standard pitch. */
	suspended: number;
	abv: number;
	diacetyl: number;
};

export type FermentationKinetics = {
	/** Apparent attenuation as a fraction of the original gravity points. */
	apparent: number;
	abv: number;
	/** Gravity points left, split by what they are. */
	remaining: { glucose: number; maltose: number; maltotriose: number; dextrins: number };
	/** 0–10 sensory contributions, for the flavour model to use directly. */
	esters: number;
	fusels: number;
	diacetyl: number;
	/** Peak yeast in suspension, relative to the pitch. */
	peakSuspended: number;
	/** How many generations the pitch had to run. More growth, more flavour. */
	growthFactor: number;
	/** Set when the beer stopped short, with the reason it stopped. */
	stalled: false | 'cold' | 'flocculated' | 'alcohol' | 'time';
	curve: FermentationDay[];
};

export type FermentationInput = {
	/** Original gravity in points, e.g. 50 for 1.050. */
	ogPoints: number;
	/** What the mash made, as mass fractions. */
	spectrum: SugarSpectrum;
	yeast: Yeast;
	pitchRate: PitchRate;
	steps: { tempC: number; days: number }[];
	/** Chilling to near freezing at the end drops the yeast out for good. */
	coldCrash: boolean;
};

/* -------------------------------------------------------------------------- */
/* Rates                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Temperature response of a working yeast cell, relative to its own ideal.
 *
 * Roughly a doubling every 10 °C over the working range, tailing off at the
 * cold end where the cell is simply sluggish and at the hot end where it is
 * stressed. Lager strains carry their own ideal, so this is relative rather
 * than absolute: 10 °C is fast for a lager strain and nearly stopped for an
 * ale one, and that difference lives in the strain's `tempIdealC`.
 */
function tempResponse(tempC: number, yeast: Yeast): number {
	const d = tempC - yeast.tempIdealC;
	const q10 = Math.pow(2, d / 10);
	// Below its range the cell slows sharply; above it, it works but suffers.
	const cold = tempC < yeast.tempMinC ? Math.exp((tempC - yeast.tempMinC) / 3.5) : 1;
	const hot = tempC > yeast.tempMaxC + 4 ? 0.85 : 1;
	return Math.max(0, q10 * cold * hot);
}

/** How much of the pitch went in, relative to a healthy standard one. */
function pitchSize(rate: PitchRate): number {
	if (rate === 'under') return 0.45;
	if (rate === 'over') return 1.8;
	return 1;
}

/**
 * How well a strain carries maltotriose, the sugar it takes last and least.
 *
 * This is the single biggest reason two yeasts finish the same wort at
 * different gravities, and it is already implied by the strain's published
 * attenuation — a 68% English ale leaves most of it, an 88% saison takes
 * nearly all of it. So it is derived rather than entered twice and left to
 * drift apart.
 */
function maltotrioseAbility(yeast: Yeast): number {
	return clamp01((yeast.attenuation - 0.62) / 0.26);
}

/**
 * Whether a strain can break dextrins down itself.
 *
 * Most yeast cannot: a dextrin is too big to carry into the cell, so whatever
 * the mash left as dextrin stays in the glass. A few strains — saison yeast,
 * Brett, anything the trade calls diastaticus — secrete an enzyme that chops
 * dextrins up outside the cell and then eat the pieces. It is slow, it carries
 * on for weeks, and it is the entire reason a saison finishes at 1.002 where
 * an ale yeast on identical wort stops at 1.012.
 *
 * It is also why those strains are a menace in a bottle: given long enough
 * they keep going, and the gravity a brewer thought was final was not.
 */
function dextrinaseRate(yeast: Yeast): number {
	if (yeast.souring > 0) return 0.006;
	if (yeast.attenuation >= 0.86) return 0.0045;
	return 0;
}

function clamp01(n: number): number {
	return Math.max(0, Math.min(1, n));
}

const FLOC_RATE: Record<Yeast['flocculation'], number> = {
	low: 0.02,
	medium: 0.06,
	high: 0.14
};

/**
 * Calibrated so that a standard pitch of a strain, held at its ideal
 * temperature for long enough on wort from an ordinary 66 °C mash, finishes
 * on the attenuation printed on its packet. Everything else is a departure
 * from that.
 */
const K = {
	/** Maximum specific growth rate per hour at the strain's ideal. */
	growth: 0.115,
	/** Cells the wort can support, per point of gravity, relative to a pitch. */
	capacityPerPoint: 0.078,
	/** Sugar uptake per unit of suspended yeast per hour, by sugar. */
	uptake: { glucose: 0.145, maltose: 0.1, maltotriose: 0.055 },
	/** Glucose concentration at which maltose uptake is half repressed. */
	repressionK: 4.5,
	/** Half-saturation for uptake, in gravity points. */
	monodK: 1.6,
	/** Ester and fusel yield per unit of growth. */
	esterPerGrowth: 0.345,
	fuselPerGrowth: 0.5,
	/** Diacetyl spilled per unit of growth, and reabsorbed per yeast-hour. */
	diacetylPerGrowth: 5.5,
	diacetylUptake: 0.035
} as const;

/* -------------------------------------------------------------------------- */
/* The model                                                                  */
/* -------------------------------------------------------------------------- */

export function simulateFermentation(input: FermentationInput): FermentationKinetics {
	const { ogPoints, spectrum, yeast, pitchRate, steps, coldCrash } = input;

	/*
	 * The mash spectrum is a set of mass fractions; here it becomes gravity
	 * points, which is what actually disappears as the beer ferments.
	 */
	const extract = spectrum.glucose + spectrum.maltose + spectrum.maltotriose + spectrum.dextrins;
	const scale = extract > 0 ? ogPoints / extract : 0;
	let g1 = spectrum.glucose * scale;
	let g2 = spectrum.maltose * scale;
	/*
	 * Only the share of the maltotriose this strain can actually carry across
	 * its membrane counts as sugar. The rest is as inert as a dextrin, however
	 * long the beer sits, which is the real reason an English ale finishes
	 * sweeter than a saison on identical wort.
	 */
	const g3Total = spectrum.maltotriose * scale;
	const g3Usable = g3Total * maltotrioseAbility(yeast);
	let g3 = g3Usable;
	let dextrins = spectrum.dextrins * scale + (g3Total - g3Usable);
	const dex = dextrinaseRate(yeast);

	let x = pitchSize(pitchRate);
	const pitched = x;
	/*
	 * Yeast grows once, early, and then stops — not because it runs out of
	 * sugar but because it runs out of the oxygen and sterols it needs to build
	 * new membrane. So growth has a budget rather than a carrying capacity it
	 * can keep returning to: pitch half as much and the same budget buys twice
	 * the number of generations, which is why an underpitched beer tastes of
	 * more of everything the growing yeast makes.
	 */
	const capacity = Math.max(x, ogPoints * K.capacityPerPoint);
	let budget = Math.max(0, capacity - pitched);
	let abv = 0;
	let esters = 0;
	let fusels = 0;
	let diacetyl = 0;
	let peak = x;
	let totalGrowth = 0;

	const curve: FermentationDay[] = [];
	let hour = 0;
	let day = 0;

	const record = (tempC: number) => {
		curve.push({
			day,
			tempC,
			points: g1 + g2 + g3 + dextrins,
			suspended: x,
			abv,
			diacetyl
		});
	};
	record(steps[0]?.tempC ?? yeast.tempIdealC);

	for (const step of steps) {
		const tempC = step.tempC;
		const days = Math.max(0, Math.round(step.days));
		const rate = tempResponse(tempC, yeast);
		// Warm yeast stays up; cold yeast settles faster, and so does a
		// flocculent strain once there is little left to hold it in suspension.
		const flocBase = FLOC_RATE[yeast.flocculation];

		for (let d = 0; d < days; d++) {
			for (let h = 0; h < 24; h++) {
				const sugar = g1 + g2 + g3;
				const inhibition = clamp01(1 - Math.pow(abv / 100 / yeast.alcoholTolerance, 3));

				// Growth, while there is sugar and room for more cells.
				const growth = Math.min(
					budget,
					K.growth * rate * x * clamp01(budget / capacity) * clamp01(sugar / 6) * inhibition
				);
				budget -= growth;
				x += growth;
				totalGrowth += growth;
				peak = Math.max(peak, x);

				// Flavour is made during growth, all of it, which is why these three
				// rise and fall together rather than needing three separate rules.
				/*
				 * `esterBase` is what the strain makes at its own ideal temperature,
				 * and `tempSensitivity` is how hard that climbs when it is warmer —
				 * so the strain sets the level and the exponent sets the slope. At
				 * the ideal, warmth is 1 and the strain simply gets its own figure,
				 * however sensitive it is.
				 */
				const gravityStress = 1 + Math.max(0, ogPoints - 50) / 90;
				const warmth = Math.pow(2, (tempC - yeast.tempIdealC) / 9);
				esters +=
					growth *
					K.esterPerGrowth *
					yeast.esterBase *
					Math.pow(warmth, yeast.tempSensitivity) *
					gravityStress;
				fusels +=
					growth *
					K.fuselPerGrowth *
					Math.pow(warmth, 1.4 + yeast.tempSensitivity * 0.5) *
					gravityStress;
				diacetyl += growth * K.diacetylPerGrowth;

				// Sugars, in the order the cell can actually take them.
				const repress = K.repressionK / (K.repressionK + g1);
				const take = (amount: number, k: number, gate: number) =>
					Math.min(amount, k * x * rate * inhibition * gate * (amount / (K.monodK + amount)));

				const d1 = take(g1, K.uptake.glucose, 1);
				const d2 = take(g2, K.uptake.maltose, repress);
				const d3 = take(
					g3,
					K.uptake.maltotriose,
					repress * (K.repressionK / (K.repressionK + g2)) * maltotrioseAbility(yeast)
				);

				// Diastatic strains keep working on the dextrins the mash left behind.
				const dDex = dex > 0 ? Math.min(dextrins, dex * x * rate * inhibition) : 0;
				dextrins -= dDex;

				g1 -= d1;
				g2 -= d2;
				g3 -= d3;
				abv += (d1 + d2 + d3 + dDex) * 0.001 * 131.25;

				// Yeast in suspension takes the diacetyl back up. Only yeast that is
				// still up there, and only while it is warm enough to bother.
				diacetyl = Math.max(0, diacetyl - K.diacetylUptake * x * rate);

				// Then it falls out — faster as the sugar that kept it busy runs out.
				const settling = flocBase * (1 + clamp01(1 - sugar / 8) * 2.2) * (rate < 0.4 ? 1.6 : 1);
				x = Math.max(0.02, x - x * settling * 0.04);

				hour++;
			}
			day++;
			record(tempC);
		}
	}

	/*
	 * A cold crash drops what is left of the yeast out for good, so whatever
	 * diacetyl is still in the beer stays there. Nothing else about the beer
	 * changes; this is only the point at which cleanup stops.
	 */
	if (coldCrash) {
		x = 0.02;
		record(steps.at(-1)?.tempC ?? yeast.tempIdealC);
	}

	const left = g1 + g2 + g3;
	const apparent = ogPoints > 0 ? clamp01(1 - (left + dextrins) / ogPoints) : 0;

	const stalled = whyStalled({
		left,
		yeast,
		x,
		abv,
		hours: hour,
		lastTempC: steps.at(-1)?.tempC ?? yeast.tempIdealC
	});

	return {
		apparent,
		abv,
		remaining: { glucose: g1, maltose: g2, maltotriose: g3, dextrins },
		esters: Math.min(10, esters),
		fusels: Math.min(10, fusels),
		diacetyl: Math.min(10, diacetyl),
		peakSuspended: peak,
		growthFactor: pitched > 0 ? totalGrowth / pitched : 0,
		stalled,
		curve
	};
}

/**
 * Why a beer stopped short, when it did.
 *
 * Only fermentable sugar counts: a wort left full of dextrins by a hot mash
 * has not stalled, it has finished, and calling that a stall would blame the
 * fermentation for a decision taken at the tun.
 */
function whyStalled(args: {
	left: number;
	yeast: Yeast;
	x: number;
	abv: number;
	hours: number;
	lastTempC: number;
}): FermentationKinetics['stalled'] {
	const { left, yeast, x, abv, hours, lastTempC } = args;
	if (left < 2.5) return false;
	if (abv / 100 > yeast.alcoholTolerance * 0.95) return 'alcohol';
	if (lastTempC < yeast.tempMinC - 1) return 'cold';
	if (x < 0.12 && yeast.flocculation === 'high') return 'flocculated';
	if (hours < 24 * 5) return 'time';
	return 'flocculated';
}
