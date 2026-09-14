/**
 * How the beer you are making compares with the beer you said you wanted —
 * *while you are still making it*.
 *
 * The style panel used to hide every figure until the brew day had made it
 * true: no bitterness row until the boil was over. Honest about the beer, and
 * useless about the decision, because the moment you can still do something
 * about 87 IBU is the moment you are dragging the slider, not the moment the
 * boil ends. A reader set a porter's bittering charge three times over and was
 * told "nothing flagged so far" until it was too late to matter.
 *
 * A target is not a claim about the beer. It is a claim about the intention,
 * and "you are heading for 87, this style wants 25–45" is true the instant the
 * hop goes in. So this compares the *projected* beer against the target and
 * says so plainly, in the words a brewer would use — too bitter, finishing too
 * sweet — rather than as a red marker on a track.
 *
 * Figures that genuinely cannot be projected yet stay silent: the finish and
 * the alcohol depend on a yeast, and before one is chosen they are a range,
 * which is compared as a range. A miss is only reported when the whole range
 * misses.
 */

import { getStyle } from './styles';
import { forecast } from './forecast';
import type { Metrics, Recipe, Range, StyleProfile } from './types';

export type TargetKey = 'og' | 'fg' | 'abv' | 'ibu' | 'ebc';

export type TargetRow = {
	key: TargetKey;
	label: string;
	/** What the recipe as written is heading for. A range until a yeast is chosen. */
	low: number;
	high: number;
	range: Range;
	format: (n: number) => string;
	state: 'inside' | 'below' | 'above';
	/** True once the brew day has actually made this figure, rather than projected it. */
	settled: boolean;
	/** The miss in a brewer's words, or undefined when inside. */
	miss?: string;
};

const g3 = (n: number) => n.toFixed(3);
const g1 = (n: number) => n.toFixed(1);
const g0 = (n: number) => String(Math.round(n));

/** The words a brewer would use for each miss. */
const WORDS: Record<TargetKey, { above: string; below: string }> = {
	og: { above: 'Too much sugar to start with', below: 'Not enough sugar to start with' },
	fg: { above: 'Finishing too sweet', below: 'Finishing too dry' },
	abv: { above: 'Too strong', below: 'Too weak' },
	ibu: { above: 'Too bitter', below: 'Not bitter enough' },
	ebc: { above: 'Too dark', below: 'Too pale' }
};

/**
 * Every figure the target defines, compared against what the recipe is heading
 * for. `settled` says which of them the brew day has actually produced yet;
 * callers that want to stay silent about the unbrewed can filter on it.
 *
 * @param settledKeys the figures the brew day has already made true.
 */
export function targetRows(
	recipe: Recipe,
	metrics: Metrics,
	settledKeys: Set<TargetKey>
): { style: StyleProfile; rows: TargetRow[] } | undefined {
	const style = recipe.targetStyleId ? getStyle(recipe.targetStyleId) : undefined;
	if (!style) return undefined;
	if (recipe.fermentables.length === 0) return { style, rows: [] };

	const f = forecast(recipe);

	const build = (
		key: TargetKey,
		label: string,
		low: number,
		high: number,
		range: Range,
		format: (n: number) => string
	): TargetRow => {
		const state = high < range.min ? 'below' : low > range.max ? 'above' : 'inside';
		const settled = settledKeys.has(key);
		const shown = low === high ? format(low) : `${format(low)}–${format(high)}`;
		const miss =
			state === 'inside'
				? undefined
				: `${WORDS[key][state]}: ${shown}${key === 'ibu' ? ' IBU' : key === 'ebc' ? ' EBC' : key === 'abv' ? '%' : ''}, ${style.name.toLowerCase()} wants ${format(range.min)}–${format(range.max)}.`;
		return { key, label, low, high, range, format, state, settled, miss };
	};

	const rows: TargetRow[] = [
		build('og', 'Original gravity', metrics.og, metrics.og, style.og, g3),
		build('ebc', 'Colour', metrics.ebc, metrics.ebc, style.ebc, g0)
	];
	if (recipe.hops.length > 0) {
		rows.push(build('ibu', 'Bitterness', metrics.ibu, metrics.ibu, style.ibu, g0));
	}
	if (f) {
		rows.push(build('fg', 'Final gravity', f.fg.low, f.fg.high, style.fg, g3));
		rows.push(build('abv', 'Alcohol', f.abv.low, f.abv.high, style.abv, g1));
	}
	return { style, rows };
}

/** Only the rows that miss, strongest first. */
export function targetMisses(rows: TargetRow[]): TargetRow[] {
	return rows.filter((r) => r.state !== 'inside').sort((a, b) => distance(b) - distance(a));
}

/** How far outside the range, as a share of the range's width. */
function distance(row: TargetRow): number {
	const width = Math.max(1e-6, row.range.max - row.range.min);
	if (row.state === 'above') return (row.low - row.range.max) / width;
	if (row.state === 'below') return (row.range.min - row.high) / width;
	return 0;
}
