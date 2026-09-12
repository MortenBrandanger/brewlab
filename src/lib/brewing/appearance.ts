import type { Recipe } from './types';
import { clamp } from './calculations';
import { getFermentable, getYeast } from './ingredients';
import type { EngineContext } from './context';

/**
 * How the beer looks in the glass.
 *
 * Derived from the same simulation as everything else: colour from EBC, haze
 * from grist proteins, yeast flocculation, dry hops and cold-side handling,
 * head from carbonation and foam-positive ingredients.
 */
export type Appearance = {
	srm: number;
	/** 0–1. Above roughly 0.6 the beer is opaque rather than merely cloudy. */
	haze: number;
	/** 0–1 relative head height. */
	head: number;
	/** 0–1 bubble activity. */
	carbonation: number;
};

const SRM_HEX = [
	'#FFE699',
	'#FFE699',
	'#FFD878',
	'#FFCA5A',
	'#FFBF42',
	'#FBB123',
	'#F8A600',
	'#F39C00',
	'#EA8F00',
	'#E58500',
	'#DE7C00',
	'#D77200',
	'#CF6900',
	'#CB6200',
	'#C35900',
	'#BB5100',
	'#B54C00',
	'#B04500',
	'#A63E00',
	'#A13700',
	'#9B3200',
	'#952D00',
	'#8E2900',
	'#882300',
	'#821E00',
	'#7B1A00',
	'#771900',
	'#701400',
	'#6A0E00',
	'#660D00',
	'#5E0B00',
	'#5A0A02',
	'#600903',
	'#520907',
	'#4C0505',
	'#470606',
	'#440607',
	'#3F0708',
	'#3B0607',
	'#3A070B',
	'#36080A'
];

function hexToRgb(hex: string): [number, number, number] {
	return [
		parseInt(hex.slice(1, 3), 16),
		parseInt(hex.slice(3, 5), 16),
		parseInt(hex.slice(5, 7), 16)
	];
}

/** The familiar SRM colour chart, interpolated between whole numbers. */
export function srmToRgb(srm: number): [number, number, number] {
	const value = clamp(srm, 0, 40);
	const low = Math.floor(value);
	const high = Math.min(low + 1, 40);
	const t = value - low;
	const a = hexToRgb(SRM_HEX[low]);
	const b = hexToRgb(SRM_HEX[high]);
	return [
		Math.round(a[0] + (b[0] - a[0]) * t),
		Math.round(a[1] + (b[1] - a[1]) * t),
		Math.round(a[2] + (b[2] - a[2]) * t)
	];
}

export function srmToCss(srm: number, alpha = 1): string {
	const [r, g, b] = srmToRgb(srm);
	return alpha >= 1 ? `rgb(${r} ${g} ${b})` : `rgb(${r} ${g} ${b} / ${alpha})`;
}

/** Haze sources, independent of the rest of the simulation. */
export function hazeFor(recipe: Recipe): number {
	const totalKg = recipe.fermentables.reduce((sum, f) => sum + Math.max(0, f.weightKg), 0);
	let proteinShare = 0;
	if (totalKg > 0) {
		for (const addition of recipe.fermentables) {
			const f = getFermentable(addition.fermentableId);
			if (!f) continue;
			const hazy =
				f.id === 'wheat-malt' ||
				f.id === 'flaked-wheat' ||
				f.id === 'flaked-oats' ||
				f.id === 'rye-malt';
			if (hazy) proteinShare += addition.weightKg / totalKg;
		}
	}
	const yeast = getYeast(recipe.fermentation.yeastId);
	const flocculation =
		yeast?.flocculation === 'low' ? 0.32 : yeast?.flocculation === 'medium' ? 0.12 : 0;
	const dryHopGPerL =
		recipe.hops.filter((h) => h.use === 'dryHop').reduce((sum, h) => sum + h.grams, 0) /
		Math.max(1, recipe.batchVolumeL);

	return clamp(
		proteinShare * 0.55 +
			flocculation +
			clamp(dryHopGPerL * 0.035, 0, 0.22) +
			(recipe.fermentation.coldCrash ? -0.14 : 0.04) +
			clamp((recipe.chill.minutes - 40) / 300, 0, 0.12),
		0,
		1
	);
}

export function appearanceOf(ctx: EngineContext, srm: number): Appearance {
	const foam =
		clamp(
			0.3 +
				ctx.recipe.conditioning.co2Volumes * 0.13 +
				clamp((ctx.sensory.body - 3) * 0.04, -0.1, 0.16) -
				clamp(ctx.attenuation.abv - 8, 0, 4) * 0.03,
			0.12,
			1
		) * ctx.mash.foamFactor;

	return {
		srm,
		haze: hazeFor(ctx.recipe),
		head: clamp(foam, 0.1, 1),
		carbonation: clamp(ctx.recipe.conditioning.co2Volumes / 3.6, 0.05, 1)
	};
}

/** A plain description of the pour, used as the accessible text for the glass. */
export function describeAppearance(appearance: Appearance, ebc: number): string {
	const colour =
		appearance.srm < 3
			? 'straw'
			: appearance.srm < 6
				? 'gold'
				: appearance.srm < 10
					? 'deep gold'
					: appearance.srm < 15
						? 'amber'
						: appearance.srm < 22
							? 'copper'
							: appearance.srm < 30
								? 'deep brown'
								: 'black';
	const clarity =
		appearance.haze < 0.15
			? 'brilliantly clear'
			: appearance.haze < 0.35
				? 'slightly hazy'
				: appearance.haze < 0.6
					? 'hazy'
					: 'opaque';
	const head =
		appearance.head < 0.3
			? 'a thin head'
			: appearance.head < 0.6
				? 'a good head'
				: 'a thick, standing head';
	return `A ${colour} beer at ${Math.round(ebc)} EBC, ${clarity}, with ${head}.`;
}
