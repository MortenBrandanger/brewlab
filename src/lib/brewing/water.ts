import type {
	FermentableAddition,
	Litres,
	SaltAdditions,
	SaltKey,
	WaterProfile,
	WaterSetup
} from './types';
import { getFermentable } from './ingredients';

/* -------------------------------------------------------------------------- */
/* Source profiles                                                            */
/* -------------------------------------------------------------------------- */

export const WATER_PROFILES: WaterProfile[] = [
	{
		id: 'soft-pilsner',
		name: 'Soft (Pilsen)',
		description: 'Almost distilled. Lets delicate malt and noble hops through untouched.',
		calcium: 7,
		magnesium: 2,
		sodium: 2,
		sulfate: 5,
		chloride: 5,
		bicarbonate: 15
	},
	{
		id: 'balanced',
		name: 'Balanced',
		description: 'Moderate minerals with sulfate and chloride roughly level. A safe default.',
		calcium: 65,
		magnesium: 8,
		sodium: 15,
		sulfate: 70,
		chloride: 70,
		bicarbonate: 40
	},
	{
		id: 'hop-forward',
		name: 'Hop-forward (Burton-ish)',
		description: 'Sulfate dominant. Sharpens bitterness and dries the finish.',
		calcium: 110,
		magnesium: 15,
		sodium: 20,
		sulfate: 250,
		chloride: 55,
		bicarbonate: 50
	},
	{
		id: 'malt-forward',
		name: 'Malt-forward',
		description: 'Chloride dominant. Rounds the palate and lifts malt sweetness.',
		calcium: 90,
		magnesium: 8,
		sodium: 25,
		sulfate: 55,
		chloride: 160,
		bicarbonate: 50
	},
	{
		id: 'dark-alkaline',
		name: 'Dark and alkaline (Dublin-ish)',
		description: 'High bicarbonate. Only makes sense with a dark, acidic grist.',
		calcium: 115,
		magnesium: 5,
		sodium: 12,
		sulfate: 55,
		chloride: 20,
		bicarbonate: 210
	},
	{
		id: 'ro',
		name: 'Reverse osmosis',
		description: 'A blank slate. Build exactly the profile you want with salts.',
		calcium: 0,
		magnesium: 0,
		sodium: 0,
		sulfate: 0,
		chloride: 0,
		bicarbonate: 0
	}
];

export const WATER_PROFILE_BY_ID = new Map(WATER_PROFILES.map((p) => [p.id, p]));

/* -------------------------------------------------------------------------- */
/* Salts                                                                      */
/*                                                                            */
/* Values are ppm added per gram of salt per litre of water. They come from    */
/* the familiar "per gram per gallon" figures multiplied by 3.785.             */
/* -------------------------------------------------------------------------- */

type IonContribution = {
	calcium?: number;
	magnesium?: number;
	sodium?: number;
	sulfate?: number;
	chloride?: number;
	bicarbonate?: number;
};

export const SALTS: {
	key: SaltKey;
	name: string;
	formula: string;
	blurb: string;
	/** Fraction that actually dissolves in a normal mash. */
	solubility: number;
	ions: IonContribution;
}[] = [
	{
		key: 'gypsum',
		name: 'Gypsum',
		formula: 'CaSO₄·2H₂O',
		blurb: 'Adds calcium and sulfate. Makes bitterness feel drier and more pointed.',
		solubility: 1,
		ions: { calcium: 232.8, sulfate: 557.9 }
	},
	{
		key: 'calciumChloride',
		name: 'Calcium chloride',
		formula: 'CaCl₂·2H₂O',
		blurb: 'Adds calcium and chloride. Makes the beer taste fuller and rounder.',
		solubility: 1,
		ions: { calcium: 272.6, chloride: 480.7 }
	},
	{
		key: 'epsom',
		name: 'Epsom salt',
		formula: 'MgSO₄·7H₂O',
		blurb: 'Magnesium and sulfate. Small amounts only: magnesium turns harsh quickly.',
		solubility: 1,
		ions: { magnesium: 98.4, sulfate: 389.9 }
	},
	{
		key: 'bakingSoda',
		name: 'Baking soda',
		formula: 'NaHCO₃',
		blurb: 'Raises pH. Useful when a very dark grist drives the mash too acidic.',
		solubility: 1,
		ions: { sodium: 272.5, bicarbonate: 723 }
	},
	{
		key: 'chalk',
		name: 'Chalk',
		formula: 'CaCO₃',
		blurb: 'Raises pH, but dissolves poorly. Only about a third of it actually acts.',
		solubility: 0.35,
		ions: { calcium: 401, bicarbonate: 1215 }
	}
];

export const EMPTY_SALTS: SaltAdditions = {
	gypsum: 0,
	calciumChloride: 0,
	epsom: 0,
	bakingSoda: 0,
	chalk: 0
};

/* -------------------------------------------------------------------------- */
/* Resulting water                                                            */
/* -------------------------------------------------------------------------- */

export type WaterResult = {
	/** Ion profile after salt additions. */
	final: Omit<WaterProfile, 'id' | 'name' | 'description'>;
	source: Omit<WaterProfile, 'id' | 'name' | 'description'>;
	/** Alkalinity as CaCO₃, ppm. */
	alkalinity: number;
	/** Kolbach residual alkalinity, ppm as CaCO₃. */
	residualAlkalinity: number;
	sulfateChlorideRatio: number;
	mashPh: number;
	/** The distilled-water pH of the grist alone, before any water effect. */
	gristDiPh: number;
	/** How each term moved the pH, for the explanation panel. */
	phTerms: { label: string; delta: number }[];
};

function sourceProfile(setup: WaterSetup): Omit<WaterProfile, 'id' | 'name' | 'description'> {
	if (setup.profileId === 'custom' && setup.custom) {
		return { ...setup.custom };
	}
	const profile = WATER_PROFILE_BY_ID.get(setup.profileId) ?? WATER_PROFILE_BY_ID.get('balanced')!;
	const { calcium, magnesium, sodium, sulfate, chloride, bicarbonate } = profile;
	return { calcium, magnesium, sodium, sulfate, chloride, bicarbonate };
}

/**
 * Distilled-water pH of a single fermentable, and how strongly it resists being
 * moved. Roasted and crystal malts are both more acidic and better buffered
 * than base malt, which is why a stout can be brewed on water that would ruin a
 * pilsner.
 */
function maltAcidProfile(
	colourEbc: number,
	category: string,
	id: string
): { diPh: number; bufferPerKg: number } {
	if (id === 'acidulated') return { diPh: 3.4, bufferPerKg: 45 };
	if (category === 'sugar') return { diPh: 5.7, bufferPerKg: 0 };
	if (category === 'roast') return { diPh: 4.5, bufferPerKg: 70 };
	if (category === 'speciality')
		return { diPh: 5.7 - Math.min(0.9, colourEbc * 0.004), bufferPerKg: 55 };
	if (category === 'adjunct') return { diPh: 5.9, bufferPerKg: 30 };
	return { diPh: 5.78 - Math.min(0.15, colourEbc * 0.004), bufferPerKg: 40 };
}

/**
 * Simplified mash pH estimate.
 *
 * The mash is treated as one buffered system. Every malt contributes both a
 * distilled-water pH and a buffering capacity in milliequivalents per kilogram
 * per pH unit; together they set where the mash would land on pure water. The
 * water's residual alkalinity is then converted to milliequivalents across the
 * mash volume and divided by that buffering capacity, and acid additions are
 * subtracted the same way.
 *
 * This is a teaching model, not a titration. Real malt varies batch to batch and
 * 0.1 pH of error is entirely normal. Measure your actual mash.
 */
export function computeWater(
	setup: WaterSetup,
	fermentables: FermentableAddition[],
	totalWaterL: Litres,
	mashThicknessLPerKg: number
): WaterResult {
	const source = sourceProfile(setup);
	const final = { ...source };
	const water = Math.max(1, totalWaterL);

	for (const salt of SALTS) {
		const grams = Math.max(0, setup.salts[salt.key] ?? 0);
		if (grams <= 0) continue;
		const perLitre = (grams / water) * salt.solubility;
		for (const [ion, ppm] of Object.entries(salt.ions) as [keyof IonContribution, number][]) {
			final[ion] = (final[ion] ?? 0) + ppm * perLitre;
		}
	}

	for (const key of Object.keys(final) as (keyof typeof final)[]) {
		final[key] = Math.round(final[key] * 10) / 10;
	}

	const alkalinity = final.bicarbonate * 0.8197;
	const residualAlkalinity = alkalinity - (final.calcium / 3.5 + final.magnesium / 7);
	const sulfateChlorideRatio =
		final.chloride > 0 ? final.sulfate / final.chloride : final.sulfate > 0 ? 99 : 1;

	let buffer = 0;
	let phBuffered = 0;
	let grainKg = 0;
	for (const addition of fermentables) {
		const f = getFermentable(addition.fermentableId);
		if (!f) continue;
		const kg = Math.max(0, addition.weightKg);
		if (kg <= 0) continue;
		const { diPh, bufferPerKg } = maltAcidProfile(f.colourEbc, f.category, f.id);
		if (bufferPerKg <= 0) continue;
		grainKg += kg;
		buffer += bufferPerKg * kg;
		phBuffered += bufferPerKg * kg * diPh;
	}
	const gristDiPh = buffer > 0 ? phBuffered / buffer : 5.7;

	// Only the mash water carries alkalinity into the mash; sparge water acts
	// later and on a much weaker buffer.
	const mashWaterL = Math.max(1, grainKg * Math.max(1.2, mashThicknessLPerKg));
	const alkalinityMeq = (residualAlkalinity * mashWaterL) / 50;
	const alkalinityShift = buffer > 0 ? alkalinityMeq / buffer : 0;

	// 88% lactic acid carries about 11.5 milliequivalents per millilitre.
	const acidMl = Math.max(0, setup.lacticAcidMl);
	const acidShift = buffer > 0 ? -(acidMl * 11.5) / buffer : 0;

	const mashPh = clampPh(gristDiPh + alkalinityShift + acidShift);

	return {
		final,
		source,
		alkalinity: round1(alkalinity),
		residualAlkalinity: round1(residualAlkalinity),
		sulfateChlorideRatio: Math.round(sulfateChlorideRatio * 100) / 100,
		mashPh: Math.round(mashPh * 100) / 100,
		gristDiPh: Math.round(gristDiPh * 100) / 100,
		phTerms: [
			{ label: 'Grist on distilled water', delta: round2(gristDiPh) },
			{ label: 'Residual alkalinity of the water', delta: round2(alkalinityShift) },
			{ label: 'Acid additions', delta: round2(acidShift) }
		].filter((t) => t.delta !== 0)
	};
}

function clampPh(ph: number): number {
	if (!Number.isFinite(ph)) return 5.4;
	return Math.min(7, Math.max(3.6, ph));
}

function round1(n: number): number {
	return Math.round(n * 10) / 10;
}

function round2(n: number): number {
	return Math.round(n * 100) / 100;
}
