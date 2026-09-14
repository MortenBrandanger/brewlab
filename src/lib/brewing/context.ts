import type { Recipe, Yeast, SensoryVector } from './types';
import type { AttenuationResult, GravityResult, IbuResult, MashProfile } from './calculations';
import type { WaterResult } from './water';

/** Hop exposure summarised per use, in grams per litre. */
export type HopLoad = {
	boilGPerL: number;
	lateBoilGPerL: number;
	whirlpoolGPerL: number;
	dryHopGPerL: number;
	totalGPerL: number;
	/** Weighted aroma units before saturation. */
	flavourUnits: number;
	aromaUnits: number;
	/** Longest dry hop contact in days. */
	maxDryHopDays: number;
	/** True when any dry hop goes in while fermentation is still active. */
	dryHopDuringFermentation: boolean;
	/** Dominant aroma descriptors, most prominent first. */
	descriptors: string[];
	/** Weighted average bitterness harshness of the bittering charge, ~0.6–1.1. */
	bitternessQuality: number;
};

/**
 * Everything the sensory model, the fault model and the explanation layer need.
 * Built once per simulation so every module sees identical numbers.
 */
export type EngineContext = {
	recipe: Recipe;
	yeast: Yeast;
	gravity: GravityResult;
	mash: MashProfile;
	water: WaterResult;
	ibu: IbuResult;
	attenuation: AttenuationResult;
	hopLoad: HopLoad;
	/** Days-weighted average fermentation temperature. */
	avgFermentTempC: number;
	peakFermentTempC: number;
	totalFermentDays: number;
	/** Total brewing water, mash plus sparge. */
	totalWaterL: number;
	/** Boil-off as a fraction of the pre-boil volume. */
	boilOffFraction: number;
	sensory: SensoryVector;
	/** Intermediate risk signals shared between sensory and faults, 0–10. */
	risks: {
		fusel: number;
		diacetyl: number;
		oxidation: number;
		infection: number;
		astringency: number;
		dms: number;
		grassy: number;
		/** Chlorine left on the kit meeting the phenols in the beer: medicinal, plastic. */
		chlorophenol: number;
	};
};
