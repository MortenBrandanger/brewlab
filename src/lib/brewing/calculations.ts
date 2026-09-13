import type { Gravity, HopAddition, Litres, MashSetup, PitchRate, Recipe, Yeast } from './types';
import { getFermentable, getHop } from './ingredients';

/* -------------------------------------------------------------------------- */
/* Small conversions                                                          */
/* -------------------------------------------------------------------------- */

/** Points per kilogram per litre for pure sucrose. 46.2 ppg × 8.3454. */
export const POINTS_PER_KG_PER_L = 386;

/** Pounds per kilogram × gallons per litre, for the Morey colour formula. */
const MCU_METRIC = 8.3454;

export const sgToPoints = (sg: Gravity): number => (sg - 1) * 1000;
export const pointsToSg = (points: number): Gravity => 1 + points / 1000;
export const ebcToSrm = (ebc: number): number => ebc / 1.97;
export const srmToEbc = (srm: number): number => srm * 1.97;
export const srmToLovibond = (srm: number): number => (srm + 0.76) / 1.3546;
export const ebcToLovibond = (ebc: number): number => srmToLovibond(ebcToSrm(ebc));

export function clamp(value: number, min: number, max: number): number {
	if (!Number.isFinite(value)) return min;
	return Math.min(max, Math.max(min, value));
}

/** A saturating curve: rises quickly, then flattens. Never exceeds `ceiling`. */
export function saturate(value: number, halfPoint: number, ceiling = 10): number {
	if (value <= 0) return 0;
	return (ceiling * value) / (value + halfPoint);
}

/* -------------------------------------------------------------------------- */
/* Grist                                                                      */
/* -------------------------------------------------------------------------- */

export type GristEntry = {
	fermentableId: string;
	name: string;
	weightKg: number;
	/** Share of total grist weight, 0–1. */
	share: number;
	/** Gravity points this fermentable contributes to the batch, after efficiency. */
	points: number;
	/** Share of total extract, 0–1. */
	extractShare: number;
};

export type Grist = {
	entries: GristEntry[];
	totalKg: number;
	grainKg: number;
	sugarKg: number;
	/** Share of the grist that can convert starch, by weight. */
	diastaticShare: number;
	/** Share of the grist made of crystal and roasted malts, by weight. */
	specialityShare: number;
	roastShare: number;
	sugarShare: number;
	/** Weighted fermentability of the extract: 1 is a plain all-base-malt grist. */
	fermentability: number;
	colourMcu: number;
};

/**
 * Build the grist summary. Efficiency applies to mashed grain only; sugars
 * dissolve completely, so they always contribute their full potential.
 */
export function computeGrist(recipe: Recipe, efficiency: number, volumeL: Litres): Grist {
	const volume = Math.max(0.5, volumeL);
	const entries: GristEntry[] = [];
	let totalKg = 0;
	let grainKg = 0;
	let sugarKg = 0;
	let diastaticKg = 0;
	let specialityKg = 0;
	let roastKg = 0;
	let mcuSum = 0;
	let pointsSum = 0;
	let fermentableWeightedPoints = 0;

	for (const addition of recipe.fermentables) {
		const f = getFermentable(addition.fermentableId);
		if (!f) continue;
		const kg = Math.max(0, addition.weightKg);
		if (kg <= 0) continue;
		const isSugar = f.category === 'sugar';
		const eff = isSugar ? 1 : efficiency;
		const points = (f.potential * kg * POINTS_PER_KG_PER_L * eff) / volume;

		totalKg += kg;
		if (isSugar) sugarKg += kg;
		else grainKg += kg;
		if (f.diastatic) diastaticKg += kg;
		if (f.category === 'speciality') specialityKg += kg;
		if (f.category === 'roast') roastKg += kg;

		mcuSum += ebcToLovibond(f.colourEbc) * kg;
		pointsSum += points;
		fermentableWeightedPoints += points * f.fermentability;

		entries.push({
			fermentableId: f.id,
			name: f.name,
			weightKg: kg,
			share: 0,
			points,
			extractShare: 0
		});
	}

	for (const entry of entries) {
		entry.share = totalKg > 0 ? entry.weightKg / totalKg : 0;
		entry.extractShare = pointsSum > 0 ? entry.points / pointsSum : 0;
	}

	return {
		entries,
		totalKg,
		grainKg,
		sugarKg,
		diastaticShare: totalKg > 0 ? diastaticKg / totalKg : 0,
		specialityShare: totalKg > 0 ? specialityKg / totalKg : 0,
		roastShare: totalKg > 0 ? roastKg / totalKg : 0,
		sugarShare: totalKg > 0 ? sugarKg / totalKg : 0,
		fermentability: pointsSum > 0 ? fermentableWeightedPoints / pointsSum : 1,
		colourMcu: (mcuSum * MCU_METRIC) / volume
	};
}

/** Morey's colour approximation. Returns SRM. */
export function moreySrm(mcu: number): number {
	if (mcu <= 0) return 0;
	return 1.4922 * Math.pow(mcu, 0.6859);
}

/* -------------------------------------------------------------------------- */
/* Mash                                                                       */
/* -------------------------------------------------------------------------- */

export type MashProfile = {
	/** Time-weighted average temperature of the steps that actually convert starch. */
	effectiveTempC: number;
	conversionMinutes: number;
	hasProteinRest: boolean;
	hasBetaRest: boolean;
	hasAlphaRest: boolean;
	hasMashOut: boolean;
	/** Multiplies yeast attenuation. Above 1 means a more fermentable wort. */
	fermentabilityFactor: number;
	/** Multiplies perceived body. */
	bodyFactor: number;
	/** Multiplies brewhouse efficiency. */
	efficiencyFactor: number;
	/** Multiplies head retention. */
	foamFactor: number;
	notes: string[];
};

/** Beta-amylase activity by temperature: peaks near 63 °C, gone above 71 °C. */
function betaActivity(tempC: number): number {
	if (tempC < 55 || tempC > 72) return 0;
	return clamp(1 - Math.abs(tempC - 63) / 9, 0, 1);
}

/** Alpha-amylase activity by temperature: peaks near 70 °C, gone above 78 °C. */
function alphaActivity(tempC: number): number {
	if (tempC < 60 || tempC > 78) return 0;
	return clamp(1 - Math.abs(tempC - 70) / 10, 0, 1);
}

export function computeMashProfile(mash: MashSetup): MashProfile {
	const steps = mash.steps.filter((s) => s.minutes > 0);
	const conversionSteps = steps.filter((s) => s.tempC >= 58 && s.tempC <= 74);
	const conversionMinutes = conversionSteps.reduce((sum, s) => sum + s.minutes, 0);

	const weightedTemp =
		conversionMinutes > 0
			? conversionSteps.reduce((sum, s) => sum + s.tempC * s.minutes, 0) / conversionMinutes
			: 66;

	// A ferulic acid rest around 43–45 °C is not a protein rest; it does not
	// degrade the proteins that build foam and body.
	const hasProteinRest = steps.some((s) => s.tempC >= 46 && s.tempC <= 57 && s.minutes >= 10);
	// A rest counts as beta or alpha only if it sits clearly on one side of the
	// enzyme crossover. A single infusion at 67 °C is one rest, not two.
	const hasBetaRest = steps.some(
		(s) => s.tempC >= 58 && s.tempC <= 66 && s.minutes >= 20 && betaActivity(s.tempC) > 0.4
	);
	const hasAlphaRest = steps.some(
		(s) => s.tempC >= 67 && s.tempC <= 74 && s.minutes >= 15 && alphaActivity(s.tempC) > 0.4
	);
	const hasMashOut = steps.some((s) => s.tempC >= 75);

	const notes: string[] = [];

	// Fermentability follows the effective conversion temperature. Each degree
	// below 66 °C leaves more simple sugar behind for the yeast.
	let fermentabilityFactor = clamp(1 + (66 - weightedTemp) * 0.018, 0.85, 1.15);
	if (hasBetaRest && hasAlphaRest) {
		fermentabilityFactor *= 1.03;
		notes.push(
			'A dedicated beta rest followed by an alpha rest builds a more fermentable wort than a single infusion at the same average temperature.'
		);
	}

	// A mash that ends early has not finished converting.
	let efficiencyFactor = 1;
	if (conversionMinutes < 45 && conversionMinutes > 0) {
		const shortfall = (45 - conversionMinutes) / 45;
		efficiencyFactor -= shortfall * 0.25;
		fermentabilityFactor *= 1 - shortfall * 0.08;
		notes.push('Conversion was cut short, so some starch never became sugar.');
	}
	if (conversionMinutes === 0) {
		efficiencyFactor = 0.35;
		notes.push('No step sits in the conversion range, so almost nothing converts.');
	}
	if (weightedTemp > 73) {
		efficiencyFactor *= 0.95;
	}

	// Mash thickness: 2.5–3.5 L/kg is comfortable in every direction.
	const thickness = clamp(mash.thicknessLPerKg, 1.2, 6);
	if (thickness < 2.2) {
		efficiencyFactor *= 0.96;
		fermentabilityFactor *= 0.99;
		notes.push(
			'A very thick mash protects beta-amylase but makes the mash harder to stir and rinse.'
		);
	} else if (thickness > 4.2) {
		efficiencyFactor *= 0.98;
		fermentabilityFactor *= 1.01;
		notes.push('A thin mash converts a little more completely and slightly more fermentably.');
	}

	let bodyFactor = clamp(1 + (weightedTemp - 66) * 0.035, 0.8, 1.25);
	let foamFactor = 1;
	if (hasProteinRest) {
		bodyFactor *= 0.94;
		foamFactor *= 0.88;
		notes.push(
			'A protein rest breaks down the proteins that build body and foam. Modern malt rarely needs one.'
		);
	}
	if (hasMashOut) {
		efficiencyFactor *= 1.02;
		notes.push(
			'The mash-out — a short hot rest at the end — stops the enzymes, so the sugar profile is fixed from here, and it thins the wort so it runs off more freely.'
		);
	}

	return {
		effectiveTempC: Math.round(weightedTemp * 10) / 10,
		conversionMinutes,
		hasProteinRest,
		hasBetaRest,
		hasAlphaRest,
		hasMashOut,
		fermentabilityFactor,
		bodyFactor,
		efficiencyFactor,
		foamFactor,
		notes
	};
}

/* -------------------------------------------------------------------------- */
/* Efficiency and gravity                                                     */
/* -------------------------------------------------------------------------- */

export type GravityResult = {
	og: Gravity;
	preBoilGravity: Gravity;
	/** Average of pre-boil and post-boil gravity, used for hop utilisation. */
	boilGravity: Gravity;
	effectiveEfficiency: number;
	grist: Grist;
	efficiencyNotes: string[];
};

export function computeGravity(recipe: Recipe, mashProfile: MashProfile): GravityResult {
	const batch = Math.max(0.5, recipe.batchVolumeL);
	const preBoil = Math.max(batch, recipe.preBoilVolumeL);
	const notes: string[] = [];

	const base = clamp(recipe.efficiencyPct / 100, 0.3, 0.95);
	let efficiency = base * mashProfile.efficiencyFactor;

	// First pass to learn how dense the mash is, then adjust for it.
	const provisional = computeGrist(recipe, efficiency, batch);
	const provisionalPoints = provisional.entries.reduce((sum, e) => sum + e.points, 0);
	if (provisionalPoints > 65) {
		const excess = (provisionalPoints - 65) / 100;
		efficiency *= clamp(1 - excess * 0.55, 0.72, 1);
		notes.push('Big grain bills rinse less completely, so efficiency drops as gravity climbs.');
	}
	if (provisional.diastaticShare < 0.5 && provisional.sugarShare < 0.9) {
		const shortfall = (0.5 - provisional.diastaticShare) / 0.5;
		efficiency *= clamp(1 - shortfall * 0.35, 0.6, 1);
		notes.push(
			'There is not much enzyme-carrying malt in this grist, so conversion is incomplete.'
		);
	}

	const grist = computeGrist(recipe, efficiency, batch);
	const points = grist.entries.reduce((sum, e) => sum + e.points, 0);
	const og = pointsToSg(points);
	const preBoilPoints = (points * batch) / preBoil;

	return {
		og,
		preBoilGravity: pointsToSg(preBoilPoints),
		boilGravity: pointsToSg((points + preBoilPoints) / 2),
		effectiveEfficiency: efficiency,
		grist,
		efficiencyNotes: notes
	};
}

/* -------------------------------------------------------------------------- */
/* Bitterness                                                                 */
/* -------------------------------------------------------------------------- */

export type IbuContribution = {
	additionId: string;
	hopId: string;
	hopName: string;
	use: HopAddition['use'];
	ibu: number;
	utilisation: number;
};

export type IbuResult = {
	total: number;
	contributions: IbuContribution[];
};

/** Tinseth bigness factor: high gravity wort extracts less alpha acid. */
export function tinsethBigness(boilGravity: Gravity): number {
	return 1.65 * Math.pow(0.000125, boilGravity - 1);
}

/** Tinseth boil time factor. */
export function tinsethTimeFactor(minutes: number): number {
	return (1 - Math.exp(-0.04 * Math.max(0, minutes))) / 4.15;
}

/**
 * Whirlpool utilisation, simplified.
 *
 * Isomerisation slows sharply below boiling but does not stop. This model scales
 * the ordinary Tinseth time factor by a temperature term that reaches zero at
 * 60 °C and one at boiling, and then by 0.55 because a whirlpool stand also
 * cools throughout. It is an approximation chosen to land in the range most
 * published whirlpool measurements fall into, not a derived formula.
 */
export function whirlpoolUtilisation(boilGravity: Gravity, tempC: number, minutes: number): number {
	const tempTerm = Math.pow(clamp((tempC - 60) / 40, 0, 1), 1.7);
	if (tempTerm <= 0) return 0;
	const effectiveMinutes = Math.min(minutes, 45);
	return tinsethBigness(boilGravity) * tinsethTimeFactor(effectiveMinutes) * tempTerm * 0.55;
}

export function computeIbu(recipe: Recipe, boilGravity: Gravity): IbuResult {
	const volume = Math.max(0.5, recipe.batchVolumeL);
	const bigness = tinsethBigness(boilGravity);
	const contributions: IbuContribution[] = [];
	let total = 0;

	for (const addition of recipe.hops) {
		const hop = getHop(addition.hopId);
		if (!hop || addition.grams <= 0) continue;

		let utilisation: number;
		if (addition.use === 'boil') {
			const minutes = clamp(addition.time, 0, recipe.boilTimeMin);
			utilisation = bigness * tinsethTimeFactor(minutes);
		} else if (addition.use === 'whirlpool') {
			utilisation = whirlpoolUtilisation(boilGravity, addition.tempC ?? 80, addition.time);
		} else {
			// Dry hops contribute aroma and perceived bitterness, not measured IBU.
			utilisation = 0;
		}

		const ibu = (addition.grams * 1000 * (hop.alphaAcid / 100) * utilisation) / volume;
		if (ibu > 0) {
			total += ibu;
			contributions.push({
				additionId: addition.id,
				hopId: hop.id,
				hopName: hop.name,
				use: addition.use,
				ibu,
				utilisation
			});
		}
	}

	contributions.sort((a, b) => b.ibu - a.ibu);
	return { total, contributions };
}

/* -------------------------------------------------------------------------- */
/* Attenuation, final gravity, alcohol                                        */
/* -------------------------------------------------------------------------- */

export type AttenuationResult = {
	/** Apparent attenuation as a fraction. */
	apparent: number;
	fg: Gravity;
	abv: number;
	/** Multipliers applied to the yeast's nominal attenuation, for explanations. */
	factors: { label: string; factor: number }[];
	/** True when the beer did not finish for a modelled reason. */
	stalled: boolean;
};

export function pitchRateFactor(rate: PitchRate): number {
	if (rate === 'under') return 0.94;
	if (rate === 'over') return 1.02;
	return 1;
}

/**
 * Temperature health: fermenting outside the strain's range slows or stresses
 * the yeast. Cold is worse for finishing than warm.
 */
export function fermentationHealthFactor(yeast: Yeast, avgTempC: number): number {
	if (avgTempC < yeast.tempMinC) {
		const below = yeast.tempMinC - avgTempC;
		return clamp(1 - below * 0.035, 0.62, 1);
	}
	if (avgTempC > yeast.tempMaxC) {
		const above = avgTempC - yeast.tempMaxC;
		return clamp(1 + above * 0.004, 1, 1.03);
	}
	return 1;
}

export function computeAttenuation(
	og: Gravity,
	yeast: Yeast,
	grist: Grist,
	mash: MashProfile,
	pitchRate: PitchRate,
	avgTempC: number,
	totalFermentationDays: number
): AttenuationResult {
	const ogPoints = Math.max(0, sgToPoints(og));

	const factors: { label: string; factor: number }[] = [];
	let attenuation = yeast.attenuation;

	const mashFactor = mash.fermentabilityFactor;
	attenuation *= mashFactor;
	factors.push({ label: `Mash at ${mash.effectiveTempC} °C`, factor: mashFactor });

	// Grist fermentability already accounts for crystal malt and lactose.
	const gristFactor = clamp(grist.fermentability, 0.5, 1.25);
	attenuation *= gristFactor;
	factors.push({ label: 'Grist composition', factor: gristFactor });

	const pitch = pitchRateFactor(pitchRate);
	attenuation *= pitch;
	if (pitch !== 1) factors.push({ label: 'Pitch rate', factor: pitch });

	const health = fermentationHealthFactor(yeast, avgTempC);
	attenuation *= health;
	if (health !== 1)
		factors.push({ label: `Fermentation at ${Math.round(avgTempC)} °C`, factor: health });

	// Short fermentations simply do not finish. The curve is generous up to the
	// point where most of the work is done, then falls away quickly.
	const daysNeeded = yeast.kind === 'lager' ? 14 : 7;
	let timeFactor = 1;
	if (totalFermentationDays < daysNeeded) {
		timeFactor = clamp(0.55 + (totalFermentationDays / daysNeeded) * 0.45, 0.4, 1);
		factors.push({ label: 'Fermentation length', factor: timeFactor });
	}
	attenuation *= timeFactor;

	// Alcohol stress: once the expected ABV nears the strain's tolerance the
	// last few gravity points get much harder to reach.
	const potentialAbv = (ogPoints * attenuation * 0.001 * 131.25) / 1;
	let stressFactor = 1;
	if (potentialAbv / 100 > yeast.alcoholTolerance * 0.85) {
		const over = potentialAbv / 100 / yeast.alcoholTolerance;
		stressFactor = clamp(1 - (over - 0.85) * 0.5, 0.7, 1);
		factors.push({ label: 'Alcohol tolerance', factor: stressFactor });
	}
	attenuation *= stressFactor;

	// Compress the top end: the last few points of attenuation are always harder
	// to win than the model's multipliers suggest.
	const compressed = attenuation > 0.85 ? 0.85 + (attenuation - 0.85) * 0.55 : attenuation;
	const apparent = clamp(compressed, 0.15, 0.96);
	const fgPoints = ogPoints * (1 - apparent);
	const fg = pointsToSg(fgPoints);
	const abv = clamp((og - fg) * 131.25, 0, 30);

	const stalled = timeFactor < 0.85 || health < 0.85 || stressFactor < 0.9;

	return {
		apparent,
		fg,
		abv,
		factors,
		stalled
	};
}

/* -------------------------------------------------------------------------- */
/* Misc derived numbers                                                       */
/* -------------------------------------------------------------------------- */

/** A rough calorie estimate per 330 ml, from the usual alcohol + residual sugar split. */
export function kcalPer330(og: Gravity, fg: Gravity): number {
	const abw = ((og - fg) * 131.25 * 0.795) / 100;
	const realExtract = 0.1808 * sgToPoints(og) * 0.1 + 0.8192 * sgToPoints(fg) * 0.1;
	const calories = (6.9 * abw * 100 + 4 * (realExtract - 0.1)) * fg * 3.3;
	return Math.max(0, Math.round(calories));
}

/** Average fermentation temperature weighted by days. */
export function averageFermentationTemp(steps: { tempC: number; days: number }[]): number {
	const totalDays = steps.reduce((sum, s) => sum + Math.max(0, s.days), 0);
	if (totalDays <= 0) return 20;
	return steps.reduce((sum, s) => sum + s.tempC * Math.max(0, s.days), 0) / totalDays;
}

/**
 * Strike temperature: how hot the water has to be before the grain goes in.
 *
 * Room-temperature grain pulls a mash down several degrees the moment it is
 * stirred in, so brewers heat the liquor past the target and let the grain take
 * it the rest of the way. The 0.41 is the heat capacity of grain relative to
 * water, which is why a thin mash needs less of a head start than a thick one.
 */
export function strikeTempC(targetTempC: number, thicknessLPerKg: number, grainTempC = 20): number {
	const ratio = Math.max(0.5, thicknessLPerKg);
	return targetTempC + (0.41 / ratio) * (targetTempC - grainTempC);
}
