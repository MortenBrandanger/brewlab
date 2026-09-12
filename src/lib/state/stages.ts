export type StageId =
	'water' | 'grain' | 'mash' | 'sparge' | 'boil' | 'chill' | 'ferment' | 'condition' | 'taste';

export type StageMeta = {
	id: StageId;
	name: string;
	/**
	 * What you actually do, with your hands, in a real kitchen or shed. This
	 * leads every stage: a reader who cannot picture the physical act has no way
	 * to make sense of any control on the page.
	 */
	reality: string;
	/**
	 * Why that act matters — the part that changes the beer. Secondary to the
	 * physical description, never a replacement for it. The last stage has no
	 * such explanation: the report is the explanation.
	 */
	what?: string;
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
		reality:
			'You fill a pot with around 25 litres of water. If your tap water is not right for the beer you are making, you cut it with bottled or filtered water. Then you stir in a few grams of brewing salts, maybe a splash of acid, and put it on to heat.',
		what: 'The minerals in the water decide how bitterness and malt come across, and together with the grain they set the acidity of the mash. Get that acidity wrong and the beer tastes dull and drying however good the recipe is.',
		decide: 'which water goes in the pot',
		accent: 'hop',
		action: 'Fill and heat the water',
		actionHint: 'The pot goes on to heat, ready for the grain.',
		done: 'Water treated and heating.',
		reveals: 'how the minerals will shape the finished beer'
	},
	{
		id: 'grain',
		name: 'Grain',
		reality:
			'You weigh out four or five kilos of malt and run it through a mill, which cracks the husks open without grinding them to flour. Ten minutes with a hand crank, or the shop does it when you buy it.',
		what: 'Malt is barley that has been sprouted and then kilned to stop it, which leaves starch plus the enzymes that can convert it. How hard each malt was kilned sets the colour and most of the flavour; how much of the grist still carries enzymes decides whether the mash works at all.',
		decide: 'the backbone of the recipe: colour, body and most of the flavour',
		accent: 'amber',
		action: 'Mill the grain',
		actionHint: 'The grist is crushed and weighed, ready to mash.',
		done: 'Grain milled and weighed.',
		reveals: 'colour, the mash pH, and the gravity this grain could reach',
		requires: 'fermentables'
	},
	{
		id: 'mash',
		name: 'Mash',
		reality:
			'You tip the crushed grain into the hot water, stir the lumps out, put the lid on and walk away for an hour. It looks and smells like hot porridge.',
		what: "The enzymes break the malt's starch into sugar, and the sweet liquid that results is called wort — that is what the yeast will live on. The temperature you hold decides which enzyme does most of the work, and so how much of that sugar the yeast can actually eat.",
		decide:
			'the rest temperature and how long to hold it, which sets how much of the sugar the yeast can actually eat',
		accent: 'copper',
		action: 'Mash in',
		actionHint: 'The grain goes into the liquor and the rest begins.',
		done: 'Mashed in. The grain is resting.',
		reveals: 'how fermentable the wort is, and how full the beer will feel',
		requires: 'conversion'
	},
	{
		id: 'sparge',
		name: 'Sparge',
		reality:
			'You open the tap at the bottom of the tun and let the liquid run into the kettle, trickling more hot water over the top of the grain as it drains. Half an hour of watching a hose. The spent grain goes on the compost.',
		what: 'Something like a third of your sugar is still clinging to the grain when the mash ends. How much of it you rinse out sets the gravity — but rinse too hard and you start pulling tannin out of the husks along with it.',
		decide: 'how much wort you collect, which decides how concentrated the finished beer is',
		accent: 'copper',
		action: 'Run off and sparge',
		actionHint: 'The wort is drained and the grain rinsed into the kettle.',
		done: 'Wort collected in the kettle.',
		reveals: 'the original gravity'
	},
	{
		id: 'boil',
		name: 'Boil & hops',
		reality:
			'You bring the kettle to a rolling boil and set a timer. Hops go in at the times you planned — a handful at the start, more towards the end. There is a lot of steam, so open a window.',
		what: 'Boiling sterilises the wort, drives off raw grain notes, concentrates the sugar, and turns hop resin into bitterness — which is the reason hops go in here at all. It is still not beer: no yeast, no alcohol.',
		decide:
			'how long to boil, and the whole hop schedule — in the kettle, after the flame, and days later in the fermenter',
		accent: 'hop',
		action: 'Boil the wort',
		actionHint: 'The kettle comes up, the hops go in on schedule, and the flame goes out.',
		done: 'Boil finished. The hops are in.',
		reveals: 'bitterness, and the finished colour'
	},
	{
		id: 'chill',
		name: 'Chill',
		reality:
			'You drop a coiled copper pipe into the kettle and run cold tap water through it, or stand the whole pot in a sink of ice. Twenty minutes later it is cool enough to put your hand in, and you siphon it into a clean bucket.',
		what: 'Warm wort is sugar water with nothing defending it. Cooling fast closes the window for anything else to take hold, and the temperature you pitch at sets the flavour the yeast will make for the entire batch.',
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
		reality:
			'You sprinkle the yeast on top, seal the lid with an airlock, and put the bucket somewhere the temperature does not swing. Within a day it is bubbling. Then you leave it alone for one to three weeks.',
		what: 'The yeast turns sugar into alcohol and carbon dioxide, which is the step that makes it beer. On the way it also makes the fruity and spicy compounds that give the beer much of its character, and temperature is what controls how much of them you get.',
		decide: 'which strain, how much of it, and what temperature to hold it at',
		accent: 'hop',
		action: 'Pitch the yeast',
		actionHint: 'The yeast goes in and the schedule runs to the end.',
		done: 'Fermentation finished.',
		reveals: 'final gravity, alcohol, and everything the yeast made'
	},
	{
		id: 'condition',
		name: 'Condition',
		reality:
			'You siphon the beer into bottles with a measured dose of sugar and cap them, or into a keg and force CO₂ in. Then they go somewhere cool and you wait.',
		what: 'Two clocks run at once. Time softens the alcohol, settles the yeast and knits the malt together — and it also lets hop aroma fade and oxygen do its slow damage. Which clock matters depends entirely on the beer.',
		decide: 'how long to leave it, how cold, and how much carbonation to give it',
		accent: 'copper',
		action: 'Package it',
		actionHint: 'The beer is carbonated and put away to condition.',
		done: 'Bottled and conditioning.',
		reveals: 'how it will actually taste in the glass'
	},
	{
		id: 'taste',
		name: 'Taste',
		reality: 'You open one, pour it into a glass, and find out.',
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
