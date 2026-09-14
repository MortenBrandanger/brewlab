import type { Challenge, Recipe, SimulationResult } from './types';
import { getHop, getYeast } from './ingredients';

const distinctHops = (recipe: Recipe): number => new Set(recipe.hops.map((h) => h.hopId)).size;
const distinctFermentables = (recipe: Recipe): number =>
	new Set(recipe.fermentables.map((f) => f.fermentableId)).size;
const worstSeverity = (result: SimulationResult): number => {
	const rank = { severe: 3, warning: 2, caution: 1, info: 0 } as const;
	return result.findings.reduce((max, f) => Math.max(max, rank[f.severity]), 0);
};

/**
 * Challenges are pure predicates over a finished simulation, so they are
 * deterministic and testable in exactly the same way the engine is.
 */
export const CHALLENGES: Challenge[] = [
	{
		id: 'session-ipa',
		name: 'Small beer, big aroma',
		brief: 'Brew a session IPA under 4.5% ABV that still smells like a proper IPA.',
		hint: 'Aroma comes from whirlpool and dry hops, not from the bittering charge. A low gravity beer has less body to hide behind, so keep the bitterness in check.',
		difficulty: 'easy',
		checks: [
			{ id: 'abv', label: 'Below 4.5% ABV', test: (r) => r.metrics.abv < 4.5 },
			{ id: 'ibu', label: 'Properly bitter: at least 30 IBU', test: (r) => r.metrics.ibu >= 30 },
			{
				id: 'aroma',
				label: 'Smells strongly of hops (aroma 6 of 10 or more)',
				test: (r) => r.sensory.hopAroma >= 6
			},
			{ id: 'quality', label: 'Rated 72 or better overall', test: (r) => r.scores.overall >= 72 }
		]
	},
	{
		id: 'soft-czech-lager',
		name: 'Soft Czech lager',
		brief: 'A pale Czech lager: soft water, real bitterness, and no diacetyl.',
		hint: 'Pilsen water is almost distilled. Saaz is only about 3.5% alpha, so you need a lot of it. Lager yeast needs time, and a warm rest at the end.',
		difficulty: 'medium',
		checks: [
			{
				id: 'lager',
				label: 'Fermented with a lager strain',
				test: (_r, recipe) => getYeast(recipe.fermentation.yeastId)?.kind === 'lager'
			},
			{
				id: 'abv',
				label: 'Between 4.2% and 5.6% ABV',
				test: (r) => r.metrics.abv >= 4.2 && r.metrics.abv <= 5.6
			},
			{ id: 'ibu', label: '30–45 IBU', test: (r) => r.metrics.ibu >= 30 && r.metrics.ibu <= 45 },
			{ id: 'colour', label: 'Pale, under 14 EBC', test: (r) => r.metrics.ebc < 14 },
			{
				id: 'clean',
				label: 'No butterscotch (diacetyl) flagged',
				test: (r) => !r.findings.some((f) => f.code === 'DIACETYL_RISK')
			},
			{ id: 'quality', label: 'Rated 78 or better overall', test: (r) => r.scores.overall >= 78 }
		]
	},
	{
		id: 'rescue-sweet-stout',
		name: 'Rescue the sweet stout',
		brief: 'This stout is undrinkably sweet. Bring it back into balance without losing the roast.',
		hint: 'There are four separate sources of sweetness here: the mash temperature, two crystal malts, the lactose and the missing bitterness. You do not need to remove all of them.',
		difficulty: 'medium',
		startingRecipeId: 'oversweet-stout',
		checks: [
			{
				id: 'sweet',
				label: 'Not cloying: sweetness under 5.5 of 10',
				test: (r) => r.sensory.sweetness < 5.5
			},
			{
				id: 'roast',
				label: 'Still tastes roasty: roast 4 of 10 or more',
				test: (r) => r.sensory.roast >= 4
			},
			{ id: 'dark', label: 'Still a dark beer, 40 EBC or more', test: (r) => r.metrics.ebc >= 40 },
			{
				id: 'coherence',
				label: 'Hangs together: balance score 78 or better',
				test: (r) => r.scores.coherence.value >= 78
			}
		]
	},
	{
		id: 'aroma-without-bitterness',
		name: 'Loud but gentle',
		brief: 'Get hop aroma to 7 or more while keeping bitterness under 35 IBU.',
		hint: 'Bitterness comes from isomerisation, which needs heat and time. Aroma comes from oils, which heat destroys. Move everything off the boil.',
		difficulty: 'easy',
		checks: [
			{
				id: 'aroma',
				label: 'Smells strongly of hops (aroma 7 of 10 or more)',
				test: (r) => r.sensory.hopAroma >= 7
			},
			{ id: 'ibu', label: 'Under 35 IBU', test: (r) => r.metrics.ibu < 35 },
			{
				id: 'no-grass',
				label: 'Not over-hopped into grassiness',
				test: (r) =>
					!r.findings.some((f) => f.code === 'DRY_HOP_EXTREME' || f.code === 'DRY_HOP_TOO_LONG')
			},
			{ id: 'quality', label: 'Rated 75 or better overall', test: (r) => r.scores.overall >= 75 }
		]
	},
	{
		id: 'four-ingredients',
		name: 'Four ingredients',
		brief: 'Water, one malt, one hop, one yeast. Make it a beer worth drinking.',
		hint: 'Reinheitsgebot brewing is about process, not ingredients. Mash temperature, hop timing and fermentation temperature are the only levers you have left.',
		difficulty: 'hard',
		checks: [
			{
				id: 'one-malt',
				label: 'Exactly one fermentable',
				test: (_r, recipe) => distinctFermentables(recipe) === 1
			},
			{
				id: 'one-hop',
				label: 'Exactly one hop variety',
				test: (_r, recipe) => distinctHops(recipe) === 1
			},
			{
				id: 'bitter',
				label: 'Some bitterness to it: at least 18 IBU',
				test: (r) => r.metrics.ibu >= 18
			},
			{ id: 'quality', label: 'Rated 80 or better overall', test: (r) => r.scores.overall >= 80 }
		]
	},
	{
		id: 'dry-saison',
		name: 'Dry saison, no heat',
		brief: 'Finish at 1.006 or below, above 5.5% ABV, without any solvent heat.',
		hint: 'Saison yeast genuinely likes it warm, but starting hot is still a mistake. Pitch cool, let it rise, and use the mash to build fermentability rather than pushing the yeast.',
		difficulty: 'medium',
		checks: [
			{
				id: 'fg',
				label: 'Finishes bone dry: final gravity 1.006 or below',
				test: (r) => r.metrics.fg <= 1.006
			},
			{ id: 'abv', label: 'Above 5.5% ABV', test: (r) => r.metrics.abv > 5.5 },
			{
				id: 'no-fusel',
				label: 'No hot, solvent alcohol flagged',
				test: (r) => !r.findings.some((f) => f.code === 'FUSEL_RISK')
			},
			{
				id: 'warmth',
				label: 'No noticeable burn: alcohol warmth 4 of 10 or less',
				test: (r) => r.sensory.alcoholWarmth <= 4
			},
			{
				id: 'technical',
				label: 'Cleanly made: technical score 82 or better',
				test: (r) => r.scores.technical.value >= 82
			}
		]
	},
	{
		id: 'balanced-imperial-stout',
		name: 'Ten percent, still balanced',
		brief: 'An imperial stout at 9.5% ABV or more that still holds together.',
		hint: 'Big beers fail in two ways: stalled fermentation and fusel alcohol. Pitch heavily, start at the cool end, and give it time both in the fermenter and afterwards.',
		difficulty: 'hard',
		checks: [
			{ id: 'abv', label: '9.5% ABV or more', test: (r) => r.metrics.abv >= 9.5 },
			{
				id: 'roast',
				label: 'Strongly roasty: roast 6 of 10 or more',
				test: (r) => r.sensory.roast >= 6
			},
			{
				id: 'warmth',
				label: 'Warm but not burning: alcohol warmth 7 of 10 or less',
				test: (r) => r.sensory.alcoholWarmth <= 7
			},
			{
				id: 'coherence',
				label: 'Hangs together: balance score 78 or better',
				test: (r) => r.scores.coherence.value >= 78
			},
			{
				id: 'technical',
				label: 'Cleanly made: technical score 78 or better',
				test: (r) => r.scores.technical.value >= 78
			}
		]
	},
	{
		id: 'repair-the-brew',
		name: 'Repair the brew',
		brief: 'Every stage of this recipe has a problem. Find them all and make it good.',
		hint: 'Work forwards: water, grist, mash, boil, chill, pitch, ferment, package. The report lists what it found, and each finding names the fields to look at.',
		difficulty: 'hard',
		startingRecipeId: 'flawed-brown',
		checks: [
			{
				id: 'no-severe',
				label: 'Nothing serious flagged',
				test: (r) => worstSeverity(r) <= 1
			},
			{ id: 'abv', label: 'At least 4.5% ABV', test: (r) => r.metrics.abv >= 4.5 },
			{ id: 'quality', label: 'Rated 78 or better overall', test: (r) => r.scores.overall >= 78 }
		]
	},
	{
		id: 'flawless-pilsner',
		name: 'Nowhere to hide',
		brief: 'A pale lager under 10 EBC with no findings worse than a caution.',
		hint: 'Pale lagers expose everything: DMS from a short boil, diacetyl from a rushed fermentation, oxidation from a careless transfer. This is a process challenge, not a recipe one.',
		difficulty: 'hard',
		checks: [
			{ id: 'pale', label: 'Very pale: under 10 EBC', test: (r) => r.metrics.ebc < 10 },
			{
				id: 'lager',
				label: 'Fermented with a lager strain',
				test: (_r, recipe) => getYeast(recipe.fermentation.yeastId)?.kind === 'lager'
			},
			{ id: 'clean', label: 'Nothing worse than a caution', test: (r) => worstSeverity(r) <= 1 },
			{
				id: 'technical',
				label: 'Near-faultless: technical score 90 or better',
				test: (r) => r.scores.technical.value >= 90
			}
		]
	},
	{
		id: 'noble-restraint',
		name: 'Noble restraint',
		brief: 'A malt-forward beer using only European hops, with real flavour under 4% ABV.',
		hint: 'Low alcohol means low gravity, which means very little to taste unless the malt does the work. Munich and Vienna give depth without sweetness.',
		difficulty: 'medium',
		checks: [
			{
				id: 'european',
				label: 'Only German, Czech, English, Slovenian or French hops',
				test: (_r, recipe) =>
					recipe.hops.length > 0 &&
					recipe.hops.every((h) => {
						const hop = getHop(h.hopId);
						return hop
							? ['German', 'Czech', 'English', 'Slovenian', 'French'].includes(hop.origin)
							: false;
					})
			},
			{ id: 'abv', label: 'Under 4% ABV', test: (r) => r.metrics.abv < 4 },
			{
				id: 'malt',
				label: 'Tastes clearly of malt: 4.5 of 10 or more',
				test: (r) => r.sensory.malt >= 4.5
			},
			{ id: 'quality', label: 'Rated 75 or better overall', test: (r) => r.scores.overall >= 75 }
		]
	}
];

export const CHALLENGE_BY_ID = new Map(CHALLENGES.map((c) => [c.id, c]));

export type ChallengeEvaluation = {
	challengeId: string;
	checks: { id: string; label: string; passed: boolean }[];
	passedCount: number;
	total: number;
	complete: boolean;
};

export function evaluateChallenge(
	challenge: Challenge,
	result: SimulationResult,
	recipe: Recipe
): ChallengeEvaluation {
	const checks = challenge.checks.map((check) => ({
		id: check.id,
		label: check.label,
		passed: safeTest(check.test, result, recipe)
	}));
	const passedCount = checks.filter((c) => c.passed).length;
	return {
		challengeId: challenge.id,
		checks,
		passedCount,
		total: checks.length,
		complete: passedCount === checks.length
	};
}

function safeTest(
	test: (result: SimulationResult, recipe: Recipe) => boolean,
	result: SimulationResult,
	recipe: Recipe
): boolean {
	try {
		return test(result, recipe) === true;
	} catch {
		return false;
	}
}
