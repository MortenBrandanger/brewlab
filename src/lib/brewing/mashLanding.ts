/**
 * Where the mash actually lands.
 *
 * A brewer with twenty years at the kettle, asked what this simulator was
 * missing, said the whole texture of the mash hour was the moment after the
 * grain goes in: *"I aimed for 66, I got 64.5, do I fix it or live with it."*
 * Every calculator assumes you hit the number. Nobody does. The grain was
 * colder than the formula thought, the tun soaked up heat, the water was a
 * degree off — and the beer that comes out is the beer of the temperature you
 * got, not the one you wrote down.
 *
 * So the app rolls the miss. Deterministically: the same recipe always lands
 * in the same place, because the seed is the recipe, so a saved brew replays
 * exactly and the engine's promise that the same input gives the same output
 * survives. The spread is the one the variance layer already uses for "how
 * badly does a brew day usually miss" — one standard deviation of 1.1 °C,
 * clipped so that no freak roll puts the mash outside the enzymes' range.
 *
 * What the brewer does about it is a real decision with a real cost either
 * way, and that is the point: topping up with near-boiling water lifts the
 * temperature and thins the mash; living with it changes what the yeast will
 * be able to eat.
 */

import type { Recipe } from './types';
import { normal, rng } from './variance';
import { GRAIN_ABSORPTION_L_PER_KG } from './simulate';

/** One standard deviation of the miss, in °C. The variance layer's figure. */
export const MISS_SIGMA_C = 1.1;
/** A miss inside this is not worth a decision. */
export const CLOSE_ENOUGH_C = 0.6;

export type MashLanding = {
	/** The first conversion rest on the recipe sheet. */
	aimC: number;
	/** What the thermometer read. */
	landedC: number;
	/** landed − aim, in °C. */
	missC: number;
	/** True when the miss is too small to be worth acting on. */
	closeEnough: boolean;
	/** Litres of water at 98 °C that would lift the mash back to its aim. */
	topUpL: number;
};

/**
 * A seed from the parts of the recipe that are settled by the time the grain
 * goes in. The hops and the yeast are not among them, so changing a hop later
 * does not retroactively move where the mash landed.
 */
function seedFor(recipe: Recipe): number {
	const text = JSON.stringify([
		recipe.batchVolumeL,
		recipe.fermentables.map((f) => [f.fermentableId, f.weightKg]),
		recipe.mash.steps.map((s) => [s.tempC, s.minutes]),
		recipe.mash.thicknessLPerKg,
		recipe.water.profileId
	]);
	let h = 0x9e3779b9;
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

export function mashLanding(recipe: Recipe): MashLanding | undefined {
	const first = recipe.mash.steps.find((s) => s.tempC >= 58 && s.tempC <= 74 && s.minutes > 0);
	if (!first) return undefined;
	const aimC = first.tempC;
	const draw = Math.max(-2.3, Math.min(2.3, normal(rng(seedFor(recipe)))));
	const landedC = Math.round((aimC + draw * MISS_SIGMA_C) * 2) / 2;
	const missC = landedC - aimC;

	/*
	 * Heat balance for the top-up: the mash weighs roughly the grain plus the
	 * water in it, and water at 98 °C carries the difference. Grain absorbs
	 * about its own weight in litres before any of it is "free", which is why
	 * the absorbed share is counted in the mass.
	 */
	const grainKg = recipe.fermentables.reduce((sum, f) => sum + Math.max(0, f.weightKg), 0);
	const mashMass = grainKg * (recipe.mash.thicknessLPerKg + GRAIN_ABSORPTION_L_PER_KG);
	const topUpL =
		missC < 0 ? Math.round(((mashMass * -missC) / Math.max(1, 98 - aimC)) * 10) / 10 : 0;

	return {
		aimC,
		landedC,
		missC,
		closeEnough: Math.abs(missC) < CLOSE_ENOUGH_C,
		topUpL
	};
}
