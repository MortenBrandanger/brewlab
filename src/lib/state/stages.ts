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
	/**
	 * What this stage sets in the finished beer. Deliberately a consequence and
	 * never a list of the controls below it, which say their own names.
	 */
	decide?: string;
	/** Accent used for the stage's controls and scene. */
	accent: 'copper' | 'amber' | 'hop';
	/** The brewing action that ends this stage and starts the next. */
	action: string;
	/** Shown on the stage once it has been done. */
	done: string;
	/**
	 * What becomes knowable once this stage is done. Absent where the action
	 * reveals nothing new — the water stage already shows what the water does
	 * before you press anything.
	 */
	reveals?: string;
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
			'You fill a pot with your brewing water. If your tap water is not right for the beer you are making, you cut it with bottled or filtered water. Then you stir in a few grams of brewing salts, maybe a splash of acid, and put it on to heat.',
		what: 'The minerals in the water decide how bitterness and malt come across, and together with the grain they set the acidity of the mash. Mash pH matters more than any single ion: between 5.2 and 5.6 the enzymes work well, the husks keep their tannins to themselves, and the beer tastes bright rather than dull. Get it wrong and the beer tastes drying however good the recipe is. You cannot know it yet — it comes from the water and the grain together.',
		accent: 'hop',
		action: 'Fill and heat the water',
		done: 'Water treated and heating.'
	},
	{
		id: 'grain',
		name: 'Grain',
		reality:
			'You weigh out four or five kilos of malt and run it through a mill, which cracks the husks open without grinding them to flour. Ten minutes with a hand crank, or the shop does it when you buy it.',
		what: 'Malt is barley that has been sprouted and then kilned to stop it, which leaves starch plus the enzymes that can convert it. How hard each malt was kilned sets the colour and most of the flavour; how much of the grist still carries enzymes decides whether the mash works at all.',
		decide: 'the backbone of the beer: its colour, its body and most of its flavour',
		accent: 'amber',
		action: 'Mill the grain',
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
		decide: 'how dry or how full the finished beer will be',
		accent: 'copper',
		action: 'Mash in',
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
		decide: 'how strong the beer ends up',
		accent: 'copper',
		action: 'Run off and sparge',
		done: 'Wort collected in the kettle.',
		reveals: 'the original gravity'
	},
	{
		id: 'boil',
		name: 'Boil & hops',
		reality:
			'You bring the kettle to a rolling boil and set a timer. Hops go in at the times you planned — a handful at the start, more towards the end. There is a lot of steam, so open a window.',
		what: 'Boiling sterilises the wort, drives off raw grain notes, concentrates the sugar, and turns hop resin into bitterness — which is the reason hops go in here at all. It is still not beer: no yeast, no alcohol.',
		decide: 'how bitter it is, and how much of the hops you will smell',
		accent: 'hop',
		action: 'Boil the wort',
		done: 'Boil finished. The hops are in.',
		reveals: 'bitterness, and the finished colour'
	},
	{
		id: 'chill',
		name: 'Chill',
		reality:
			'You drop a coiled copper pipe into the kettle and run cold tap water through it, or stand the whole pot in a sink of ice. Twenty minutes later it is cool enough to put your hand in, and you siphon it into a clean bucket.',
		what: 'Warm wort is sugar water with nothing defending it. Cooling fast closes the window for anything else to take hold, and the temperature you pitch at sets the flavour the yeast will make for the entire batch.',
		decide: 'how much risk the beer carries into fermentation',
		accent: 'amber',
		action: 'Chill and transfer',
		done: 'Chilled and in the fermenter.',
		reveals: 'what the cold side put at risk'
	},
	{
		id: 'ferment',
		name: 'Ferment',
		reality:
			'You sprinkle the yeast on top, seal the lid with an airlock, and put the bucket somewhere the temperature does not swing. Within a day it is bubbling. Then you leave it alone for one to three weeks.',
		what: 'The yeast turns sugar into alcohol and carbon dioxide, which is the step that makes it beer. On the way it also makes the fruity and spicy compounds that give the beer much of its character, and temperature is what controls how much of them you get.',
		decide: 'how much of its own character the yeast puts into the beer',
		accent: 'hop',
		action: 'Pitch the yeast',
		done: 'Fermentation finished.',
		reveals: 'final gravity, alcohol, and everything the yeast made'
	},
	{
		id: 'condition',
		name: 'Condition',
		reality:
			'You siphon the beer into bottles with a measured dose of sugar and cap them, or into a keg and force CO₂ in. Then they go somewhere cool and you wait.',
		what: 'Two clocks run at once. Time softens the alcohol, settles the yeast and knits the malt together — and it also lets hop aroma fade and oxygen do its slow damage. Which clock matters depends entirely on the beer.',
		decide: 'how the beer actually arrives in the glass',
		accent: 'copper',
		action: 'Package it',
		done: 'Bottled and conditioning.',
		reveals: 'how it will actually taste in the glass'
	},
	{
		id: 'taste',
		name: 'Taste',
		reality: 'You open one, pour it into a glass, and find out.',
		accent: 'amber',
		action: 'Pour a glass',
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
