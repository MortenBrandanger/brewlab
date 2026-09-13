/**
 * What the beer could still become, given what has not been decided yet.
 *
 * The app has always refused to claim a number before it was true: no gravity
 * before the mash, no alcohol before fermentation. That is honest, but it is
 * also silent, and silence is not the only honest answer available. By the time
 * the wort is in the kettle the sugar is settled — what is not settled is how
 * much of it the yeast will eat, and that is a range rather than a mystery.
 *
 * So instead of hiding the figure, this works out the span it could land in
 * across every choice still open, and lets the span narrow as the brew day goes
 * on. Before a yeast is chosen the alcohol is a range across the strains that
 * could plausibly be used; the moment one is picked it collapses to a number.
 *
 * That turns the panel from a record of what has happened into something with
 * an opinion about what is coming, without ever claiming to know more than it
 * does — and it makes the yeast question feel consequential before the reader
 * reaches it, which is precisely when it would be useful to know.
 */

import { YEASTS } from './ingredients';
import { simulate } from './simulate';
import type { Recipe } from './types';

export type Forecast = {
	/** True when the span is a genuine range rather than a settled figure. */
	open: boolean;
	low: number;
	high: number;
	/** What would close it, phrased to finish "depending on …". */
	dependsOn: string;
};

/**
 * The alcohol this wort could finish at.
 *
 * Only the strains an ordinary brewer would reach for: the wild and mixed
 * cultures can take a beer somewhere none of the others would go, and
 * including them would widen the range into uselessness for the ninety-nine
 * brews in a hundred that will never use one.
 */
export function forecastAbv(recipe: Recipe): Forecast | undefined {
	if (recipe.fermentables.length === 0) return undefined;

	if (recipe.fermentation.yeastId) {
		const abv = simulate(recipe).metrics.abv;
		return { open: false, low: abv, high: abv, dependsOn: '' };
	}

	const candidates = YEASTS.filter((y) => y.kind !== 'wild');
	let low = Infinity;
	let high = -Infinity;
	for (const yeast of candidates) {
		/*
		 * Each strain is tried at the middle of its own working range, because a
		 * brewer choosing a lager strain would also ferment it cold. Holding the
		 * schedule fixed would ask what a lager yeast does at ale temperature,
		 * which is a question nobody is about to pose.
		 */
		const tempC = Math.round((yeast.tempMinC + yeast.tempMaxC) / 2);
		const days = yeast.kind === 'lager' ? 28 : 14;
		const abv = simulate({
			...recipe,
			fermentation: {
				...recipe.fermentation,
				yeastId: yeast.id,
				steps: [{ id: 'forecast', label: 'Primary', tempC, days }]
			}
		}).metrics.abv;
		low = Math.min(low, abv);
		high = Math.max(high, abv);
	}

	if (!Number.isFinite(low)) return undefined;
	return { open: true, low, high, dependsOn: 'which yeast you pick' };
}
