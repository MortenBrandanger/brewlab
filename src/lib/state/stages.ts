export type StageId =
	'water' | 'grain' | 'mash' | 'sparge' | 'boil' | 'chill' | 'ferment' | 'condition' | 'taste';

export type StageMeta = {
	id: StageId;
	name: string;
	/** One line shown under the stage title. */
	lead: string;
	/** Accent used for the stage's controls and scene. */
	accent: 'copper' | 'amber' | 'hop';
	/** The brewing action that ends this stage and starts the next. */
	action: string;
	/** What that action is actually doing, in one line. */
	actionHint: string;
	/** Shown on the stage once it has been done. */
	done: string;
	/** What becomes knowable about the beer once this stage is done. */
	reveals: string;
	/** Blocks the action until this is true. */
	requires?: 'fermentables' | 'conversion';
};

/**
 * The nine stages, in order.
 *
 * Each one ends with a deliberate action rather than a Next button, because
 * brewing is a sequence of irreversible-feeling moments and the simulator reads
 * better when it behaves that way. Revisiting an earlier stage is always
 * allowed: progress only ever moves forward, and every number recalculates the
 * instant a control moves.
 */
export const STAGES: StageMeta[] = [
	{
		id: 'water',
		name: 'Water',
		lead: 'Ninety percent of the beer, and the part most brewers ignore. Mineral content decides how it feels before a grain is wet.',
		accent: 'hop',
		action: 'Treat the water',
		actionHint: 'Salts and acid go in, and the liquor is ready for the grain.',
		done: 'Liquor treated and heating.',
		reveals: 'how the minerals will shape the finished beer'
	},
	{
		id: 'grain',
		name: 'Grain',
		lead: 'Build the grist. This sets the colour, the body and most of what you will actually taste.',
		accent: 'amber',
		action: 'Mill the grain',
		actionHint: 'The grist is crushed and weighed, ready to mash.',
		done: 'Grist milled and weighed.',
		reveals: 'colour, the mash pH, and the gravity this grain could reach',
		requires: 'fermentables'
	},
	{
		id: 'mash',
		name: 'Mash',
		lead: 'Hot water meets crushed grain and enzymes turn starch into sugar. Temperature decides how much of it the yeast can use.',
		accent: 'copper',
		action: 'Mash in',
		actionHint: 'The grain goes into the liquor and the rest begins.',
		done: 'Mashed in. Conversion under way.',
		reveals: 'how fermentable the wort is, and how full the beer will feel',
		requires: 'conversion'
	},
	{
		id: 'sparge',
		name: 'Sparge',
		lead: 'Rinse the sugar out of the grain bed and decide how much wort you carry to the kettle.',
		accent: 'copper',
		action: 'Run off and sparge',
		actionHint: 'The wort is drained and the grain rinsed into the kettle.',
		done: 'Kettle full. Wort collected.',
		reveals: 'the original gravity'
	},
	{
		id: 'boil',
		name: 'Boil & hops',
		lead: 'Heat and time make bitterness. Everything added after the flame goes out makes aroma instead.',
		accent: 'hop',
		action: 'Boil the wort',
		actionHint: 'The kettle comes up, the hops go in on schedule, and the flame goes out.',
		done: 'Boil finished. Hops in.',
		reveals: 'bitterness, and the finished colour'
	},
	{
		id: 'chill',
		name: 'Chill',
		lead: 'From flameout to pitching temperature the wort is warm, sugary and unprotected. Speed and cleanliness are the whole game.',
		accent: 'amber',
		action: 'Chill and transfer',
		actionHint: 'The wort comes down to pitching temperature and moves to the fermenter.',
		done: 'Chilled and in the fermenter.',
		reveals: 'what the cold side put at risk'
	},
	{
		id: 'ferment',
		name: 'Ferment',
		lead: 'The yeast is the brewer now. Your job is to give it the conditions it wants and then leave it alone.',
		accent: 'hop',
		action: 'Pitch the yeast',
		actionHint: 'The yeast goes in and the schedule runs to the end.',
		done: 'Fermentation complete.',
		reveals: 'final gravity, alcohol, and everything the yeast made'
	},
	{
		id: 'condition',
		name: 'Condition',
		lead: 'Time, temperature and carbonation. Some beers gain here. Hop-forward ones only lose.',
		accent: 'copper',
		action: 'Package it',
		actionHint: 'The beer is carbonated and put away to condition.',
		done: 'Packaged and conditioning.',
		reveals: 'how it will actually taste in the glass'
	},
	{
		id: 'taste',
		name: 'Taste',
		lead: 'What the model predicts, and exactly why it predicts it.',
		accent: 'amber',
		action: 'Pour a glass',
		actionHint: 'Everything the simulation knows, laid out.',
		done: 'Poured.',
		reveals: 'the full judgement'
	}
];

export const STAGE_BY_ID = new Map(STAGES.map((s) => [s.id, s]));

export function stageIndex(id: StageId): number {
	return STAGES.findIndex((s) => s.id === id);
}

/**
 * What is knowable about the beer after each stage.
 *
 * Before the mash there is no wort, so there is no gravity; before fermentation
 * there is no alcohol. Showing those numbers on the water stage is the fastest
 * way to make a simulator feel like a spreadsheet.
 */
export type Reveal =
	| 'water'
	| 'colour'
	| 'potential'
	| 'gravity'
	| 'bitterness'
	| 'risk'
	| 'alcohol'
	| 'flavour'
	| 'judgement';

const REVEALED_AFTER: Record<Reveal, StageId> = {
	water: 'water',
	colour: 'grain',
	potential: 'grain',
	gravity: 'sparge',
	bitterness: 'boil',
	risk: 'chill',
	alcohol: 'ferment',
	flavour: 'condition',
	judgement: 'taste'
};

export function revealedAt(reveal: Reveal): number {
	return stageIndex(REVEALED_AFTER[reveal]);
}

/** Maps the recipe fields a finding names onto the stage that owns them. */
const FIELD_STAGE: [string, StageId][] = [
	['water', 'water'],
	['fermentables', 'grain'],
	['mash', 'mash'],
	['preBoilVolumeL', 'sparge'],
	['batchVolumeL', 'sparge'],
	['efficiencyPct', 'sparge'],
	['hops', 'boil'],
	['boilTimeMin', 'boil'],
	['chill', 'chill'],
	['fermentation', 'ferment'],
	['conditioning', 'condition']
];

export function stageForFields(fields: string[]): StageId | undefined {
	for (const field of fields) {
		const match = FIELD_STAGE.find(([prefix]) => field.startsWith(prefix));
		if (match) return match[1];
	}
	return undefined;
}
