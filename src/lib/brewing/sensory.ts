import type { FermentableCategory, HopAddition, Recipe, SensoryKey, SensoryVector } from './types';
import { getFermentable, getHop } from './ingredients';
import { clamp, saturate, sgToPoints } from './calculations';
import type { EngineContext, HopLoad } from './context';

export const SENSORY_KEYS: SensoryKey[] = [
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

export const SENSORY_LABELS: Record<SensoryKey, string> = {
	sweetness: 'Sweetness',
	bitterness: 'Bitterness',
	body: 'Body',
	malt: 'Malt',
	caramel: 'Caramel',
	roast: 'Roast',
	hopFlavour: 'Hop flavour',
	hopAroma: 'Hop aroma',
	fruitEsters: 'Fruit esters',
	phenols: 'Phenols',
	acidity: 'Acidity',
	alcoholWarmth: 'Alcohol warmth',
	crispness: 'Crispness'
};

export function emptySensory(): SensoryVector {
	return {
		sweetness: 0,
		bitterness: 0,
		body: 0,
		malt: 0,
		caramel: 0,
		roast: 0,
		hopFlavour: 0,
		hopAroma: 0,
		fruitEsters: 0,
		phenols: 0,
		acidity: 0,
		alcoholWarmth: 0,
		crispness: 0
	};
}

/* -------------------------------------------------------------------------- */
/* Grist flavour                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Share at which a category reaches half of its full-grist flavour.
 * Roasted grain is potent, base malt is not: 5% chocolate malt is obviously
 * roasty, while 5% pale malt is not obviously anything.
 */
const SHARE_HALF: Record<FermentableCategory, number> = {
	base: 0.5,
	adjunct: 0.25,
	speciality: 0.08,
	roast: 0.035,
	sugar: 0.06
};

const POTENCY: Record<FermentableCategory, number> = {
	base: 1,
	adjunct: 1,
	speciality: 1.4,
	roast: 1.3,
	sugar: 1
};

export type GristFlavour = {
	vector: SensoryVector;
	/** The malts that shaped the flavour most, strongest first. */
	drivers: { name: string; axis: SensoryKey; amount: number }[];
};

export function gristFlavour(recipe: Recipe): GristFlavour {
	const vector = emptySensory();
	const drivers: { name: string; axis: SensoryKey; amount: number }[] = [];
	const totalKg = recipe.fermentables.reduce((sum, a) => sum + Math.max(0, a.weightKg), 0);
	if (totalKg <= 0) return { vector, drivers };

	for (const addition of recipe.fermentables) {
		const f = getFermentable(addition.fermentableId);
		if (!f || addition.weightKg <= 0) continue;
		const share = addition.weightKg / totalKg;
		const half = SHARE_HALF[f.category];
		const response = share / (share + half);
		for (const [axis, value] of Object.entries(f.sensory) as [SensoryKey, number][]) {
			const amount = value * POTENCY[f.category] * response;
			vector[axis] += amount;
			if (amount >= 0.4) drivers.push({ name: f.name, axis, amount });
		}
	}

	drivers.sort((a, b) => b.amount - a.amount);
	return { vector, drivers };
}

/* -------------------------------------------------------------------------- */
/* Hop exposure                                                               */
/* -------------------------------------------------------------------------- */

function boilFlavourWeight(minutes: number): number {
	if (minutes >= 30) return 0.15;
	if (minutes >= 20) return 0.45;
	if (minutes >= 10) return 0.8;
	return 1;
}

function boilAromaWeight(minutes: number): number {
	if (minutes >= 20) return 0.05;
	if (minutes >= 10) return 0.2;
	if (minutes >= 5) return 0.4;
	return 0.6;
}

/** Cooler whirlpools keep more of the volatile oils. */
function whirlpoolAromaTempFactor(tempC: number): number {
	return clamp(1.25 - (tempC - 70) / 60, 0.7, 1.25);
}

function whirlpoolTimeFactor(minutes: number): number {
	return clamp(0.4 + (Math.min(minutes, 40) / 40) * 0.6, 0.2, 1);
}

/**
 * Dry hop effectiveness by contact time. Most extraction happens in the first
 * two to three days; after five days the curve is flat and grassy notes start
 * to build instead.
 */
function dryHopTimeFactor(days: number): number {
	if (days <= 0) return 0;
	return clamp(1 - Math.exp(-days / 1.8), 0, 1);
}

export function computeHopLoad(recipe: Recipe): HopLoad {
	const volume = Math.max(0.5, recipe.batchVolumeL);
	let boilGPerL = 0;
	let lateBoilGPerL = 0;
	let whirlpoolGPerL = 0;
	let dryHopGPerL = 0;
	let flavourUnits = 0;
	let aromaUnits = 0;
	let maxDryHopDays = 0;
	let dryHopDuringFermentation = false;
	let harshnessWeighted = 0;
	let harshnessWeight = 0;
	const descriptorScores = new Map<string, number>();

	for (const addition of recipe.hops) {
		const hop = getHop(addition.hopId);
		if (!hop || addition.grams <= 0) continue;
		const gPerL = addition.grams / volume;
		let flavour: number;
		let aroma: number;

		if (addition.use === 'boil') {
			boilGPerL += gPerL;
			if (addition.time < 30) lateBoilGPerL += gPerL;
			flavour = gPerL * hop.aromaIntensity * boilFlavourWeight(addition.time);
			aroma = gPerL * hop.aromaIntensity * boilAromaWeight(addition.time);
			if (addition.time >= 30) {
				harshnessWeighted += hop.bitternessQuality * addition.grams * hop.alphaAcid;
				harshnessWeight += addition.grams * hop.alphaAcid;
			}
		} else if (addition.use === 'whirlpool') {
			whirlpoolGPerL += gPerL;
			const tempFactor = whirlpoolAromaTempFactor(addition.tempC ?? 80);
			const timeFactor = whirlpoolTimeFactor(addition.time);
			flavour = gPerL * hop.aromaIntensity * 1.2 * tempFactor * timeFactor;
			aroma = gPerL * hop.aromaIntensity * 1.3 * tempFactor * timeFactor;
		} else {
			dryHopGPerL += gPerL;
			maxDryHopDays = Math.max(maxDryHopDays, addition.time);
			const active = (addition.day ?? 5) <= 3;
			if (active) dryHopDuringFermentation = true;
			// CO2 scrubbing costs aroma during active fermentation, but the yeast
			// also converts hop compounds into new fruity ones.
			const scrub = active ? 0.82 : 1;
			const timeFactor = dryHopTimeFactor(addition.time);
			flavour = gPerL * hop.aromaIntensity * 0.5 * timeFactor * scrub;
			aroma = gPerL * hop.aromaIntensity * 2.2 * timeFactor * scrub;
		}

		flavourUnits += flavour;
		aromaUnits += aroma;
		const weight = aroma + flavour;
		for (const tag of hop.tags) {
			descriptorScores.set(tag, (descriptorScores.get(tag) ?? 0) + weight);
		}
	}

	const descriptors = [...descriptorScores.entries()]
		.filter(([, score]) => score > 0.15)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 4)
		.map(([tag]) => tag);

	return {
		boilGPerL,
		lateBoilGPerL,
		whirlpoolGPerL,
		dryHopGPerL,
		totalGPerL: boilGPerL + whirlpoolGPerL + dryHopGPerL,
		flavourUnits,
		aromaUnits,
		maxDryHopDays,
		dryHopDuringFermentation,
		descriptors,
		bitternessQuality: harshnessWeight > 0 ? harshnessWeighted / harshnessWeight : 0.8
	};
}

/* -------------------------------------------------------------------------- */
/* Risk signals                                                               */
/* -------------------------------------------------------------------------- */

export function computeRisks(
	ctx: Omit<EngineContext, 'sensory' | 'risks'>
): EngineContext['risks'] {
	const { recipe, yeast, attenuation, hopLoad, avgFermentTempC, peakFermentTempC } = ctx;
	const abv = attenuation.abv;

	// Fusel alcohols: hot fermentation on a strong wort, worse when underpitched.
	const overIdeal = Math.max(0, peakFermentTempC - yeast.tempIdealC);
	const overMax = Math.max(0, peakFermentTempC - yeast.tempMaxC);
	const pitchPenalty =
		recipe.fermentation.pitchRate === 'under'
			? 1.6
			: recipe.fermentation.pitchRate === 'over'
				? 0.85
				: 1;
	const strength = clamp((abv - 5) / 6, 0, 1.6);
	const fusel = clamp(
		(overIdeal * 0.28 * yeast.tempSensitivity + overMax * 0.7) * pitchPenalty * (1 + strength),
		0,
		10
	);

	// Diacetyl: lager strains, cold and rushed fermentation, no warm rest.
	const lagerFactor = yeast.kind === 'lager' ? 1.8 : 1;
	const days = ctx.totalFermentDays;
	const needed = yeast.kind === 'lager' ? 16 : 9;
	const shortfall = clamp((needed - days) / needed, 0, 1);
	const hasRest = recipe.fermentation.steps.some(
		(s, i) => i > 0 && s.tempC >= recipe.fermentation.steps[0].tempC + 3 && s.days >= 2
	);
	const coldFinish = clamp((yeast.tempMinC - avgFermentTempC) / 6, 0, 1);
	const diacetyl = clamp(
		(shortfall * 5.5 + coldFinish * 3 + (recipe.fermentation.pitchRate === 'under' ? 1.5 : 0)) *
			lagerFactor *
			(hasRest ? 0.45 : 1),
		0,
		10
	);

	// Oxidation: careless transfer, long warm conditioning, heavy dry hopping.
	const transfer = recipe.chill.transferQuality;
	const transferRisk = transfer === 'careless' ? 5.5 : transfer === 'normal' ? 2 : 0.4;
	const warmAge = clamp(
		((recipe.conditioning.tempC - 8) / 14) * (recipe.conditioning.days / 40),
		0,
		3
	);
	const dryHopOxygen = clamp(hopLoad.dryHopGPerL / 6, 0, 1.5);
	const oxidation = clamp(transferRisk + warmAge + dryHopOxygen, 0, 10);

	// Infection: slow chilling, careless handling, wild cultures aside.
	const chillRisk = clamp((recipe.chill.minutes - 30) / 60, 0, 3);
	const hotPitch = clamp((recipe.chill.pitchTempC - (yeast.tempMaxC + 2)) / 5, 0, 3);
	const infection = clamp(chillRisk + hotPitch + (transfer === 'careless' ? 2.5 : 0), 0, 10);

	// DMS: pilsner malt plus a short or covered boil.
	const pilsnerShare = recipe.fermentables.reduce((sum, a) => {
		const f = getFermentable(a.fermentableId);
		return f && f.id === 'pilsner' ? sum + a.weightKg : sum;
	}, 0);
	const totalKg = recipe.fermentables.reduce((sum, a) => sum + Math.max(0, a.weightKg), 0);
	const pilsnerFraction = totalKg > 0 ? pilsnerShare / totalKg : 0;
	const shortBoil = clamp((75 - recipe.boilTimeMin) / 45, 0, 1);
	const slowChillDms = clamp((recipe.chill.minutes - 40) / 90, 0, 1);
	const dms = clamp(pilsnerFraction * (shortBoil * 6 + slowChillDms * 3.5), 0, 10);

	// Astringency: too much husk, high mash pH, over-sparging, harsh dark malt.
	const phRisk = clamp((ctx.water.mashPh - 5.65) * 9, 0, 5);
	const roastRisk = clamp((ctx.gravity.grist.roastShare - 0.07) * 40, 0, 3);
	const spargeRisk = clamp(
		(ctx.totalWaterL / Math.max(1, ctx.gravity.grist.grainKg) - 6.5) / 2,
		0,
		2.5
	);
	const astringency = clamp(phRisk + roastRisk + spargeRisk, 0, 10);

	// Grassy: very long or very heavy dry hopping.
	const grassy = clamp(
		Math.max(0, hopLoad.maxDryHopDays - 5) * 0.7 + Math.max(0, hopLoad.dryHopGPerL - 8) * 0.5,
		0,
		10
	);

	return { fusel, diacetyl, oxidation, infection, astringency, dms, grassy };
}

/* -------------------------------------------------------------------------- */
/* The sensory vector                                                         */
/* -------------------------------------------------------------------------- */

/** Hop aroma fades in the package, faster when warm. */
export function hopFadeFactor(days: number, tempC: number): number {
	if (days <= 0) return 1;
	const halfLifeDays = clamp(70 - (tempC - 2) * 2.6, 16, 80);
	return clamp(Math.pow(0.5, days / halfLifeDays), 0.25, 1);
}

export function computeSensory(ctx: Omit<EngineContext, 'sensory'>): SensoryVector {
	const { recipe, yeast, gravity, mash, water, ibu, attenuation, hopLoad, avgFermentTempC, risks } =
		ctx;
	const vector = gristFlavour(recipe).vector;

	const fgPoints = Math.max(0, sgToPoints(attenuation.fg));
	const ogPoints = Math.max(0, sgToPoints(gravity.og));
	const abv = attenuation.abv;
	const sulfate = water.final.sulfate;
	const chloride = water.final.chloride;

	/* Body ---------------------------------------------------------------- */
	const gravityBody = saturate(fgPoints, 13, 7);
	vector.body = clamp(
		(gravityBody + vector.body) * mash.bodyFactor + clamp((abv - 5) * 0.18, 0, 1.5),
		0,
		10
	);
	// Chloride fills the palate out; sulfate strips it back.
	vector.body += clamp((chloride - 60) / 90, -0.8, 1.2);

	/* Sweetness ----------------------------------------------------------- */
	// Residual gravity is the main driver; ingredient sweetness is scaled back so
	// a sugar that raises FG is not counted twice.
	const gravitySweetness = saturate(Math.max(0, fgPoints - 6), 14, 8);
	vector.sweetness = clamp(vector.sweetness * 0.65 + gravitySweetness, 0, 10);

	/* Bitterness ---------------------------------------------------------- */
	const ibuBase = saturate(ibu.total, 45, 12);
	const sulfateFactor = clamp(1 + (sulfate - 90) / 420, 0.85, 1.3);
	const harshness = clamp(hopLoad.bitternessQuality, 0.6, 1.1);
	const dryHopBite = clamp(hopLoad.dryHopGPerL * 0.16, 0, 1.6);
	const sweetnessMasking = vector.sweetness * 0.22;
	vector.bitterness = clamp(
		vector.bitterness +
			ibuBase * sulfateFactor * (0.85 + harshness * 0.18) +
			dryHopBite -
			sweetnessMasking,
		0,
		10
	);

	/* Hop flavour and aroma ------------------------------------------------ */
	const fade = hopFadeFactor(recipe.conditioning.days, recipe.conditioning.tempC);
	vector.hopFlavour = clamp(saturate(hopLoad.flavourUnits, 2.5, 10) * (0.55 + fade * 0.45), 0, 10);
	vector.hopAroma = clamp(saturate(hopLoad.aromaUnits, 3, 10) * fade, 0, 10);
	if (risks.grassy > 0) {
		vector.hopFlavour = clamp(vector.hopFlavour - risks.grassy * 0.12, 0, 10);
	}

	/* Yeast character ------------------------------------------------------ */
	const tempDelta = avgFermentTempC - yeast.tempIdealC;
	const esterTemp = 1 + tempDelta * yeast.tempSensitivity * 0.055;
	const esterGravity = 1 + clamp((ogPoints - 50) / 100, -0.2, 0.6);
	const esterPitch =
		recipe.fermentation.pitchRate === 'under'
			? 1.25
			: recipe.fermentation.pitchRate === 'over'
				? 0.88
				: 1;
	vector.fruitEsters = clamp(yeast.esterBase * esterTemp * esterGravity * esterPitch, 0, 10);

	// Biotransformation: dry hopping into active fermentation lifts fruitiness.
	if (hopLoad.dryHopDuringFermentation) {
		vector.fruitEsters = clamp(
			vector.fruitEsters + clamp(hopLoad.dryHopGPerL * 0.12, 0, 1.2),
			0,
			10
		);
	}

	const phenolTemp = 1 + tempDelta * yeast.tempSensitivity * 0.04;
	vector.phenols = clamp(vector.phenols + yeast.phenolBase * phenolTemp, 0, 10);

	/* Acidity -------------------------------------------------------------- */
	vector.acidity = clamp(
		vector.acidity + yeast.souring * 1.2 + recipe.water.lacticAcidMl * 0.05 + vector.roast * 0.08,
		0,
		10
	);

	/* Alcohol -------------------------------------------------------------- */
	vector.alcoholWarmth = clamp(clamp((abv - 5.2) * 1.05, 0, 8) + risks.fusel * 0.45, 0, 10);

	/* Crispness ------------------------------------------------------------ */
	const dryness = clamp((attenuation.apparent - 0.7) * 14, -2, 3.5);
	const carbonation = clamp((recipe.conditioning.co2Volumes - 2.2) * 1.6, -1.5, 2.5);
	const lagerCrisp = yeast.kind === 'lager' ? 1.2 : 0;
	vector.crispness = clamp(
		vector.crispness +
			3.4 +
			dryness +
			carbonation +
			lagerCrisp +
			clamp((sulfate - 80) / 160, -0.5, 1.4) -
			vector.body * 0.35,
		0,
		10
	);

	/* Faults that reach the glass ------------------------------------------ */
	if (risks.astringency > 3)
		vector.bitterness = clamp(vector.bitterness + (risks.astringency - 3) * 0.2, 0, 10);
	if (risks.oxidation > 5) {
		vector.hopAroma = clamp(vector.hopAroma - (risks.oxidation - 5) * 0.5, 0, 10);
		vector.caramel = clamp(vector.caramel + (risks.oxidation - 5) * 0.25, 0, 10);
	}
	if (risks.infection > 5)
		vector.acidity = clamp(vector.acidity + (risks.infection - 5) * 0.4, 0, 10);

	/* Conditioning smoothing ------------------------------------------------ */
	if (recipe.conditioning.days > 21) {
		const meld = clamp((recipe.conditioning.days - 21) / 60, 0, 1);
		vector.roast = clamp(vector.roast * (1 - meld * 0.08), 0, 10);
		vector.alcoholWarmth = clamp(vector.alcoholWarmth * (1 - meld * 0.12), 0, 10);
		vector.malt = clamp(vector.malt * (1 + meld * 0.05), 0, 10);
	}

	for (const key of SENSORY_KEYS) {
		const value = vector[key];
		vector[key] = Number.isFinite(value) ? Math.round(clamp(value, 0, 10) * 10) / 10 : 0;
	}
	return vector;
}

/** Human descriptions for a 0–10 axis value. */
export function describeIntensity(value: number): string {
	if (value < 0.6) return 'absent';
	if (value < 1.8) return 'barely there';
	if (value < 3.2) return 'subtle';
	if (value < 5) return 'moderate';
	if (value < 6.8) return 'pronounced';
	if (value < 8.4) return 'strong';
	return 'dominant';
}

export function hopAdditionSummary(addition: HopAddition): string {
	if (addition.use === 'boil') {
		return addition.time === 0 ? 'at flameout' : `${addition.time} min left in the boil`;
	}
	if (addition.use === 'whirlpool') {
		return `${addition.time} min whirlpool at ${addition.tempC ?? 80} °C`;
	}
	return `dry hop on day ${addition.day ?? 5} for ${addition.time} day${addition.time === 1 ? '' : 's'}`;
}
