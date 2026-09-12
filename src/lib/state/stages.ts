export type StageId =
	'water' | 'grain' | 'mash' | 'sparge' | 'boil' | 'chill' | 'ferment' | 'condition' | 'taste';

export type StageMeta = {
	id: StageId;
	name: string;
	/** One line shown under the stage title. */
	lead: string;
	/** Accent used for the stage's controls and scene. */
	accent: 'copper' | 'amber' | 'hop';
};

export const STAGES: StageMeta[] = [
	{
		id: 'water',
		name: 'Water',
		lead: 'Everything else dissolves into this. Mineral content decides how the beer feels before a grain is wet.',
		accent: 'hop'
	},
	{
		id: 'grain',
		name: 'Grain',
		lead: 'The grist sets colour, body and most of what you will taste.',
		accent: 'amber'
	},
	{
		id: 'mash',
		name: 'Mash',
		lead: 'Enzymes turn starch into sugar. Temperature decides how much of it the yeast can use.',
		accent: 'copper'
	},
	{
		id: 'sparge',
		name: 'Sparge',
		lead: 'Rinse the sugar out of the grain and decide how much wort you are carrying to the kettle.',
		accent: 'copper'
	},
	{
		id: 'boil',
		name: 'Boil & hops',
		lead: 'Heat and time make bitterness. Everything after the flame makes aroma.',
		accent: 'hop'
	},
	{
		id: 'chill',
		name: 'Chill',
		lead: 'From here on the wort is vulnerable. Speed and cleanliness are the whole game.',
		accent: 'amber'
	},
	{
		id: 'ferment',
		name: 'Ferment',
		lead: 'The yeast is now the brewer. Your job is to give it the conditions it wants.',
		accent: 'hop'
	},
	{
		id: 'condition',
		name: 'Condition',
		lead: 'Time, temperature and carbonation. Some beers gain here; hoppy ones only lose.',
		accent: 'copper'
	},
	{
		id: 'taste',
		name: 'Taste',
		lead: 'What the model predicts, and exactly why it predicts it.',
		accent: 'amber'
	}
];

export const STAGE_BY_ID = new Map(STAGES.map((s) => [s.id, s]));

export function stageIndex(id: StageId): number {
	return STAGES.findIndex((s) => s.id === id);
}
