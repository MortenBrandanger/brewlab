import type { Metrics, Range, SensoryKey, SensoryVector, StyleMatch, StyleProfile } from './types';
import { STYLES, getStyle } from './styles';
import { SENSORY_LABELS } from './sensory';
import { clamp } from './calculations';

type Weighted = {
	key: string;
	label: string;
	penalty: number;
	weight: number;
	direction: 'above' | 'below';
};

/**
 * Distance from a range, measured in range widths. Zero inside the range, one
 * when the value sits a full range width outside it.
 */
function rangePenalty(
	value: number,
	range: Range
): { penalty: number; direction: 'above' | 'below' } {
	const width = Math.max(range.max - range.min, 1e-6);
	if (value < range.min) return { penalty: (range.min - value) / width, direction: 'below' };
	if (value > range.max) return { penalty: (value - range.max) / width, direction: 'above' };
	return { penalty: 0, direction: 'above' };
}

const METRIC_WEIGHTS = { abv: 1, ibu: 1.2, ebc: 1.2, og: 0.7, fg: 0.9 };

/**
 * Not every sensory axis defines a style equally. Hop aroma, roast, phenols and
 * acidity are the ones a taster uses to place a beer in seconds; sweetness and
 * body only narrow it down afterwards.
 */
const SENSORY_WEIGHT = 0.55;
const SENSORY_WEIGHTS: Partial<Record<SensoryKey, number>> = {
	hopAroma: 0.95,
	roast: 0.95,
	acidity: 0.85,
	phenols: 0.75
};

const MODERN_TAGS = new Set([
	'citrus',
	'tropical',
	'stone-fruit',
	'berry',
	'dank',
	'pine',
	'resin'
]);
const CLASSIC_TAGS = new Set(['floral', 'spicy', 'herbal', 'earthy']);

/**
 * Which hop family a beer's aroma belongs to, from the descriptors the engine
 * already derived. Returns undefined when there is not enough hop character to
 * judge — an unhopped beer is not "wrong" for either family.
 */
export function hopCharacterOf(
	descriptors: string[],
	hopAroma: number
): 'classic' | 'modern' | undefined {
	if (hopAroma < 2.5 || descriptors.length === 0) return undefined;
	let modern = 0;
	let classic = 0;
	descriptors.forEach((tag, index) => {
		const weight = descriptors.length - index;
		if (MODERN_TAGS.has(tag)) modern += weight;
		if (CLASSIC_TAGS.has(tag)) classic += weight;
	});
	if (modern === classic) return undefined;
	return modern > classic ? 'modern' : 'classic';
}

function scoreStyle(
	style: StyleProfile,
	metrics: Metrics,
	sensory: SensoryVector,
	hopCharacter?: 'classic' | 'modern'
): { match: number; deviations: string[] } {
	const items: Weighted[] = [];

	const push = (key: string, label: string, value: number, range: Range, weight: number) => {
		const { penalty, direction } = rangePenalty(value, range);
		items.push({ key, label, penalty: Math.min(penalty, 4), weight, direction });
	};

	push('abv', 'alcohol', metrics.abv, style.abv, METRIC_WEIGHTS.abv);
	push('ibu', 'bitterness units', metrics.ibu, style.ibu, METRIC_WEIGHTS.ibu);
	push('ebc', 'colour', metrics.ebc, style.ebc, METRIC_WEIGHTS.ebc);
	push('og', 'original gravity', metrics.og, style.og, METRIC_WEIGHTS.og);
	push('fg', 'final gravity', metrics.fg, style.fg, METRIC_WEIGHTS.fg);

	for (const [axis, range] of Object.entries(style.sensory) as [SensoryKey, Range][]) {
		push(
			axis,
			SENSORY_LABELS[axis].toLowerCase(),
			sensory[axis],
			range,
			SENSORY_WEIGHTS[axis] ?? SENSORY_WEIGHT
		);
	}

	if (style.hopCharacter && hopCharacter && style.hopCharacter !== hopCharacter) {
		items.push({
			key: 'hopCharacter',
			label:
				style.hopCharacter === 'classic'
					? 'modern hop character than the style uses'
					: 'traditional hop character than the style uses',
			penalty: 1.3,
			weight: 1.1,
			direction: 'above'
		});
	}

	const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
	const weightedPenalty =
		items.reduce((sum, i) => sum + i.penalty * i.weight, 0) / Math.max(totalWeight, 1e-6);
	const match = clamp(Math.round(100 * Math.exp(-1.1 * weightedPenalty)), 0, 100);

	const deviations = items
		.filter((i) => i.penalty > 0.25)
		.sort((a, b) => b.penalty * b.weight - a.penalty * a.weight)
		.slice(0, 3)
		.map((i) =>
			i.key === 'hopCharacter'
				? `More ${i.label}`
				: `${i.direction === 'above' ? 'More' : 'Less'} ${i.label} than the style expects`
		);

	return { match, deviations };
}

/**
 * Rank every style by similarity. Sour and wild styles are only considered when
 * the recipe actually contains a souring culture, because a clean beer that
 * happens to land on the right numbers is not a sour beer.
 */
export function classify(
	metrics: Metrics,
	sensory: SensoryVector,
	hasSouringCulture: boolean,
	hopCharacter?: 'classic' | 'modern'
): StyleMatch[] {
	const matches: StyleMatch[] = [];
	for (const style of STYLES) {
		if (style.requiresSouring && !hasSouringCulture) continue;
		const { match, deviations } = scoreStyle(style, metrics, sensory, hopCharacter);
		matches.push({ styleId: style.id, name: style.name, match, deviations });
	}
	matches.sort((a, b) => b.match - a.match);
	return matches;
}

/** The top few matches worth showing, filtered so nothing embarrassing appears. */
export function closestStyles(matches: StyleMatch[], limit = 4): StyleMatch[] {
	return matches.filter((m) => m.match >= 45).slice(0, limit);
}

/** Conformity against a chosen target style, used by Brew to Style. */
export function styleConformity(
	targetStyleId: string,
	metrics: Metrics,
	sensory: SensoryVector,
	hopCharacter?: 'classic' | 'modern'
): StyleMatch | undefined {
	const style = getStyle(targetStyleId);
	if (!style) return undefined;
	const { match, deviations } = scoreStyle(style, metrics, sensory, hopCharacter);
	return { styleId: style.id, name: style.name, match, deviations };
}

/**
 * Live, non-blocking guidance for Brew to Style: which numbers are outside the
 * target and in which direction, phrased as an observation rather than an order.
 */
export type StyleGuidanceItem = {
	key: string;
	label: string;
	value: number;
	range: Range;
	state: 'below' | 'inside' | 'above';
	format: (n: number) => string;
};

export function styleGuidance(targetStyleId: string, metrics: Metrics): StyleGuidanceItem[] {
	const style = getStyle(targetStyleId);
	if (!style) return [];
	const g3 = (n: number) => n.toFixed(3);
	const g1 = (n: number) => n.toFixed(1);
	const g0 = (n: number) => String(Math.round(n));

	const rows: {
		key: string;
		label: string;
		value: number;
		range: Range;
		format: (n: number) => string;
	}[] = [
		{ key: 'og', label: 'Original gravity', value: metrics.og, range: style.og, format: g3 },
		{ key: 'fg', label: 'Final gravity', value: metrics.fg, range: style.fg, format: g3 },
		{ key: 'abv', label: 'Alcohol', value: metrics.abv, range: style.abv, format: g1 },
		{ key: 'ibu', label: 'Bitterness', value: metrics.ibu, range: style.ibu, format: g0 },
		{ key: 'ebc', label: 'Colour', value: metrics.ebc, range: style.ebc, format: g0 }
	];

	return rows.map((row) => ({
		...row,
		state: row.value < row.range.min ? 'below' : row.value > row.range.max ? 'above' : 'inside'
	}));
}
