export type StageId =
	'water' | 'grain' | 'mash' | 'sparge' | 'boil' | 'chill' | 'ferment' | 'condition' | 'taste';

export type StageMeta = {
	id: StageId;
	name: string;
	/**
	 * What is physically happening at this point in the brew day, in plain
	 * language. This is the orientation a beginner needs before any control on
	 * the page means anything, so it is never hidden behind a disclosure.
	 */
	what: string;
	/** The decision the brewer is actually making here. Absent on the last stage. */
	decide?: string;
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
		what: 'Brewing water is not a neutral ingredient. The minerals dissolved in it change how bitterness and malt come across in the finished beer, and they set the acidity of the mash you are about to run. Right now you are filling a tank and treating what is in it.',
		decide: 'which water you brew with, and whether to adjust its minerals',
		accent: 'hop',
		action: 'Treat the water',
		actionHint: 'Salts and acid go in, and the liquor is ready for the grain.',
		done: 'Liquor treated and heating.',
		reveals: 'how the minerals will shape the finished beer'
	},
	{
		id: 'grain',
		name: 'Grain',
		what: 'Malted barley is grain that has been sprouted and then kilned to stop it. Inside each kernel is starch, plus the enzymes that can turn that starch into sugar. You are choosing which malts make up the grist and in what proportion. Nothing is heated yet — this is the shopping list.',
		decide: 'the backbone of the recipe: colour, body and most of the flavour',
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
		what: "Mashing is steeping crushed grain in hot water. Your treated water is heated to around 66 °C, the grain is stirred in, and the whole porridge-like mixture rests for an hour in a vessel called the mash tun. The malt's own enzymes break its starch down into sugar, and the sweet liquid that results is called wort — that is what the yeast will later live on.",
		decide:
			'the rest temperature and how long to hold it, which sets how much of the sugar the yeast can actually eat',
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
		what: 'The mash is finished, but the grain is still soaked in sweet wort, like coffee grounds you have not pressed. Sparging means rinsing it out: you drain the tun and trickle more hot water through the grain bed to wash the remaining sugar off it, collecting everything in the boil kettle.',
		decide: 'how much wort you collect, which decides how concentrated the finished beer is',
		accent: 'copper',
		action: 'Run off and sparge',
		actionHint: 'The wort is drained and the grain rinsed into the kettle.',
		done: 'Kettle full. Wort collected.',
		reveals: 'the original gravity'
	},
	{
		id: 'boil',
		name: 'Boil & hops',
		what: 'The wort goes into the kettle and boils, usually for an hour. Boiling sterilises it, drives off raw grain and vegetable notes, concentrates the sugar, and turns hop resin into bitterness — which is why hops go in here. This is not beer yet: there is no yeast in it and no alcohol.',
		decide:
			'how long to boil, and the whole hop schedule — in the kettle, after the flame, and days later in the fermenter',
		accent: 'hop',
		action: 'Boil the wort',
		actionHint: 'The kettle comes up, the hops go in on schedule, and the flame goes out.',
		done: 'Boil finished. Hops in.',
		reveals: 'bitterness, and the finished colour'
	},
	{
		id: 'chill',
		name: 'Chill',
		what: 'Boiling wort has to come down to a temperature the yeast can survive, usually below 20 °C, and then move into the fermenter. Adding the yeast is called pitching, and the temperature you pitch at matters more than almost anything later. It takes twenty minutes with a chiller or hours without one, and until the wort is cold and the yeast is in, nothing is protecting it from whatever else would like to grow in it.',
		decide: 'how fast you chill, how cool you pitch, and how carefully the wort is transferred',
		accent: 'amber',
		action: 'Chill and transfer',
		actionHint: 'The wort comes down to pitching temperature and moves to the fermenter.',
		done: 'Chilled and in the fermenter.',
		reveals: 'what the cold side put at risk'
	},
	{
		id: 'ferment',
		name: 'Ferment',
		what: 'Yeast eats the sugar in the wort and turns it into alcohol and carbon dioxide. This is the step that makes it beer. You seal the fermenter with an airlock and leave it somewhere temperature-stable for one to three weeks, and while it works the yeast also produces the fruity and spicy compounds that give the beer much of its character.',
		decide: 'which strain, how much of it, and what temperature to hold it at',
		accent: 'hop',
		action: 'Pitch the yeast',
		actionHint: 'The yeast goes in and the schedule runs to the end.',
		done: 'Fermentation complete.',
		reveals: 'final gravity, alcohol, and everything the yeast made'
	},
	{
		id: 'condition',
		name: 'Condition',
		what: 'Fermentation has finished and the beer is flat, cloudy and young. It goes into bottles or a keg along with a measured dose of sugar or CO₂, and then sits — usually cold — for anywhere from a week to a year. Yeast drops out, rough edges soften, and hop aroma slowly fades away.',
		decide: 'how long to leave it, how cold, and how much carbonation to give it',
		accent: 'copper',
		action: 'Package it',
		actionHint: 'The beer is carbonated and put away to condition.',
		done: 'Packaged and conditioning.',
		reveals: 'how it will actually taste in the glass'
	},
	{
		id: 'taste',
		name: 'Taste',
		what: 'Nothing left to do but drink it. Everything below is what the model expects from the beer you made, and exactly which of your decisions led there.',
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
