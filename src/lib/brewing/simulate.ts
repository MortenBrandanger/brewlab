import type { Metrics, Recipe, SimulationResult } from './types';
import { getYeast, YEASTS } from './ingredients';
import {
	averageFermentationTemp,
	clamp,
	computeAttenuation,
	computeGravity,
	computeIbu,
	computeMashProfile,
	ebcToSrm,
	kcalPer330,
	moreySrm,
	srmToEbc
} from './calculations';
import { computeWater } from './water';
import { computeHopLoad, computeRisks, computeSensory, emptySensory } from './sensory';
import { computeFindings } from './faults';
import { computeScores } from './scoring';
import { classify, closestStyles, hopCharacterOf, styleConformity } from './classify';
import { ageCurve, improvements, keyDecisions, verdict } from './explain';
import type { EngineContext } from './context';

/** Litres of water each kilogram of grain keeps for itself. */
export const GRAIN_ABSORPTION_L_PER_KG = 1.05;

function safeNumber(value: number, fallback: number): number {
	return Number.isFinite(value) ? value : fallback;
}

/**
 * Run the whole simulation.
 *
 * Deterministic: the same recipe always produces the same result. Nothing here
 * uses randomness, the clock or any browser API, so it runs identically in a
 * test and in the browser.
 */
export function simulate(recipe: Recipe): SimulationResult {
	const validation: string[] = [];

	/* ---------------------------------------------------- Validate and clamp */

	const safeRecipe: Recipe = {
		...recipe,
		batchVolumeL: clamp(safeNumber(recipe.batchVolumeL, 20), 0.5, 10000),
		preBoilVolumeL: clamp(safeNumber(recipe.preBoilVolumeL, 24), 0.5, 20000),
		boilTimeMin: clamp(safeNumber(recipe.boilTimeMin, 60), 0, 360),
		efficiencyPct: clamp(safeNumber(recipe.efficiencyPct, 72), 20, 95),
		fermentables: recipe.fermentables.filter((f) => Number.isFinite(f.weightKg) && f.weightKg > 0),
		hops: recipe.hops.filter((h) => Number.isFinite(h.grams) && h.grams > 0),
		fermentation: {
			...recipe.fermentation,
			steps: recipe.fermentation.steps.filter((s) => Number.isFinite(s.days) && s.days > 0)
		},
		conditioning: {
			days: clamp(safeNumber(recipe.conditioning.days, 14), 0, 1095),
			tempC: clamp(safeNumber(recipe.conditioning.tempC, 10), -2, 35),
			co2Volumes: clamp(safeNumber(recipe.conditioning.co2Volumes, 2.4), 0, 6)
		},
		chill: {
			...recipe.chill,
			minutes: clamp(safeNumber(recipe.chill.minutes, 25), 0, 720),
			pitchTempC: clamp(safeNumber(recipe.chill.pitchTempC, 19), 0, 45)
		}
	};

	if (recipe.batchVolumeL <= 0)
		validation.push('Batch volume must be above zero. Using 20 L for this estimate.');
	if (safeRecipe.fermentables.length === 0)
		validation.push('There are no fermentables in this recipe, so there is nothing to ferment.');
	if (safeRecipe.preBoilVolumeL < safeRecipe.batchVolumeL) {
		validation.push('Pre-boil volume is smaller than the batch volume. The boil cannot add water.');
		safeRecipe.preBoilVolumeL = safeRecipe.batchVolumeL;
	}
	if (safeRecipe.fermentation.steps.length === 0) {
		validation.push('No fermentation schedule was given. Assuming 14 days at 19 °C.');
		safeRecipe.fermentation = {
			...safeRecipe.fermentation,
			steps: [{ id: 'fallback', tempC: 19, days: 14, label: 'Primary' }]
		};
	}

	let yeast = getYeast(safeRecipe.fermentation.yeastId);
	if (!yeast) {
		validation.push('No yeast was selected. Using a clean American ale strain for this estimate.');
		yeast = YEASTS[0];
	}

	/* ------------------------------------------------------------- The engine */

	const mash = computeMashProfile(safeRecipe.mash);
	const gravity = computeGravity(safeRecipe, mash);

	const grainKg = gravity.grist.grainKg;
	const totalWaterL = safeRecipe.preBoilVolumeL + grainKg * GRAIN_ABSORPTION_L_PER_KG;
	const water = computeWater(
		safeRecipe.water,
		safeRecipe.fermentables,
		totalWaterL,
		safeRecipe.mash.thicknessLPerKg
	);

	const ibu = computeIbu(safeRecipe, gravity.boilGravity);
	const hopLoad = computeHopLoad(safeRecipe);

	const fermentSteps = safeRecipe.fermentation.steps;
	const avgFermentTempC = averageFermentationTemp(fermentSteps);
	const peakFermentTempC = fermentSteps.reduce((max, s) => Math.max(max, s.tempC), -50);
	const totalFermentDays = fermentSteps.reduce((sum, s) => sum + s.days, 0);

	const attenuation = computeAttenuation(
		gravity.og,
		yeast,
		gravity.grist,
		mash,
		safeRecipe.fermentation.pitchRate,
		avgFermentTempC,
		totalFermentDays
	);

	const boilOffFraction =
		safeRecipe.preBoilVolumeL > 0
			? clamp(
					(safeRecipe.preBoilVolumeL - safeRecipe.batchVolumeL) / safeRecipe.preBoilVolumeL,
					0,
					1
				)
			: 0;

	const partial: Omit<EngineContext, 'sensory' | 'risks'> = {
		recipe: safeRecipe,
		yeast,
		gravity,
		mash,
		water,
		ibu,
		attenuation,
		hopLoad,
		avgFermentTempC,
		peakFermentTempC,
		totalFermentDays,
		totalWaterL,
		boilOffFraction
	};

	const risks = computeRisks(partial);
	const withRisks = { ...partial, risks, sensory: emptySensory() };
	const sensory = computeSensory(withRisks);
	const ctx: EngineContext = { ...withRisks, sensory };

	/* ------------------------------------------------------------- Reporting */

	const srm = moreySrm(gravity.grist.colourMcu);
	const ebc = srmToEbc(srm);

	const metrics: Metrics = {
		og: round3(gravity.og),
		fg: round3(attenuation.fg),
		abv: round1(attenuation.abv),
		ibu: Math.round(ibu.total * 10) / 10,
		ebc: Math.round(ebc * 10) / 10,
		srm: Math.round(srm * 10) / 10,
		attenuation: Math.round(attenuation.apparent * 1000) / 10,
		mashPh: water.mashPh,
		buGu: gravity.og > 1 ? Math.round((ibu.total / ((gravity.og - 1) * 1000)) * 100) / 100 : 0,
		grainKg: Math.round(gravity.grist.totalKg * 1000) / 1000,
		preBoilGravity: round3(gravity.preBoilGravity),
		kcalPer330: kcalPer330(gravity.og, attenuation.fg),
		co2Volumes: safeRecipe.conditioning.co2Volumes
	};

	const findings = computeFindings(ctx);
	const scores = computeScores(ctx, findings);

	const hasSouringCulture = yeast.souring >= 3;
	const hopCharacter = hopCharacterOf(hopLoad.descriptors, sensory.hopAroma);
	const allStyles = classify(metrics, sensory, hasSouringCulture, hopCharacter);
	const styles = closestStyles(allStyles);
	const targetStyle = safeRecipe.targetStyleId
		? styleConformity(safeRecipe.targetStyleId, metrics, sensory, hopCharacter)
		: undefined;

	const baseQuality = Math.round(scores.overall);

	return {
		metrics,
		sensory,
		findings,
		scores,
		styles,
		keyDecisions: keyDecisions(ctx, findings),
		improvements: improvements(ctx, findings),
		ageCurve: ageCurve(ctx, baseQuality),
		verdict: verdict(ctx, scores, styles, findings),
		validation,
		targetStyle
	};
}

/**
 * The engine context, exposed for panels that want to show intermediate values
 * (hop load, water chemistry, mash profile) rather than only the final report.
 */
export function buildContext(recipe: Recipe): EngineContext | undefined {
	/*
	 * Nothing before fermentation depends on the strain -- water chemistry, mash
	 * water, grain absorption and the run-off are all settled long before the
	 * yeast goes in. Bailing out without one used to blank every derived figure
	 * on the first six stages, which is exactly when a brewer has not chosen a
	 * yeast yet. The strain-dependent parts of the context are only ever
	 * displayed once fermentation has been carried out, and that is gated on a
	 * real choice, so falling back here shows correct numbers rather than none.
	 */
	const yeast = getYeast(recipe.fermentation.yeastId) ?? YEASTS[0];
	const mash = computeMashProfile(recipe.mash);
	const gravity = computeGravity(recipe, mash);
	const totalWaterL = recipe.preBoilVolumeL + gravity.grist.grainKg * GRAIN_ABSORPTION_L_PER_KG;
	const water = computeWater(
		recipe.water,
		recipe.fermentables,
		totalWaterL,
		recipe.mash.thicknessLPerKg
	);
	const ibu = computeIbu(recipe, gravity.boilGravity);
	const hopLoad = computeHopLoad(recipe);
	const avgFermentTempC = averageFermentationTemp(recipe.fermentation.steps);
	const peakFermentTempC = recipe.fermentation.steps.reduce(
		(max, s) => Math.max(max, s.tempC),
		-50
	);
	const totalFermentDays = recipe.fermentation.steps.reduce((sum, s) => sum + s.days, 0);
	const attenuation = computeAttenuation(
		gravity.og,
		yeast,
		gravity.grist,
		mash,
		recipe.fermentation.pitchRate,
		avgFermentTempC,
		totalFermentDays
	);
	const boilOffFraction = clamp(
		(recipe.preBoilVolumeL - recipe.batchVolumeL) / Math.max(1, recipe.preBoilVolumeL),
		0,
		1
	);
	const partial = {
		recipe,
		yeast,
		gravity,
		mash,
		water,
		ibu,
		attenuation,
		hopLoad,
		avgFermentTempC,
		peakFermentTempC,
		totalFermentDays,
		totalWaterL,
		boilOffFraction
	};
	const risks = computeRisks(partial);
	const withRisks = { ...partial, risks, sensory: emptySensory() };
	return { ...withRisks, sensory: computeSensory(withRisks) };
}

/** SRM colour for the live glass, exposed for convenience. */
export function recipeSrm(recipe: Recipe): number {
	const mash = computeMashProfile(recipe.mash);
	const gravity = computeGravity(recipe, mash);
	return moreySrm(gravity.grist.colourMcu);
}

export { ebcToSrm };

function round3(n: number): number {
	return Math.round(n * 1000) / 1000;
}
function round1(n: number): number {
	return Math.round(n * 10) / 10;
}
