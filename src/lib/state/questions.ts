import { STAGES, stageIndex, type StageId } from './stages';

/**
 * The brew day as the questions it actually asks.
 *
 * Nine stages came from the brief, not from brewing, and every stage that held
 * more than one decision read as a pile — the water stage was the only one
 * anybody found clear, and the only one that asks a single question. So the
 * journey is the questions, and the nine stages are what groups them.
 *
 * A stage is still the unit the engine and the reveals work in: the grain is
 * milled or it is not, and there is no gravity before the mash. Answering the
 * last question of a stage is what carries that stage out, which is why the
 * final question of each one ends with the brewing act rather than with "next".
 */
export type Question = {
	id: string;
	/** The stage this question belongs to. Several questions may share one. */
	stage: StageId;
	/** The question itself, in the second person, ending in a question mark. */
	ask: string;
	/** One line under the question where the choice needs framing. */
	hint?: string;
	/** True when the brew can proceed with no answer at all. */
	optional?: boolean;
};

export const QUESTIONS: Question[] = [
	{
		id: 'water-profile',
		stage: 'water',
		ask: 'Which water are you brewing with?',
		hint: 'A brew day starts with a pot of water. Beer is mostly water, and what comes out of the tap is different in every town — the minerals in it decide whether bitterness lands sharp or soft, and together with the grain they set how acid the mash turns out. So before anything is heated: use your tap water, cut it with bottled, or build what you want from nothing.'
	},
	{
		id: 'grain-malts',
		stage: 'grain',
		ask: 'What malt goes in?',
		hint: 'Now the beer itself. Malt is barley that has been sprouted and then kilned to stop it, which leaves the starch the mash will turn into sugar. You weigh out four or five kilos — mostly one pale base malt, which carries the sugar and the enzymes, plus smaller amounts of darker ones for colour and flavour. Nothing else you do today changes the beer as much as this.'
	},
	{
		id: 'mash-finish',
		stage: 'mash',
		ask: 'How do you want it to finish?',
		hint: 'The crushed grain goes into the hot water, you stir the lumps out, and it sits there for an hour turning starch into sugar. The temperature you hold decides how much of that sugar the yeast will be able to eat later: hold it cool and the beer finishes thin and dry, hold it warm and more of the sugar survives into the glass.'
	},
	{
		id: 'batch-size',
		stage: 'sparge',
		ask: 'How much beer do you want?',
		hint: 'The grain is resting under a lid and nothing needs you for an hour. So decide how much beer you are actually making, because everything from here is measured against it — how much water you rinse through the grain, how much boils away, how much yeast goes in.'
	},
	{
		id: 'sparge-rig',
		stage: 'sparge',
		ask: 'What are you brewing on?',
		hint: 'The hour is up, and what happens next depends on the kit in front of you. You open the tap at the bottom of the tun and the sweet liquid — wort — runs out into the kettle, and then you rinse the grain with fresh hot water to wash out the sugar still clinging to it. That rinsing is what sparging means, and how thoroughly your setup does it is the difference between getting most of the sugar and leaving a good deal of it in the mash. It also decides how much you collect, because the boil takes some of it away as steam.'
	},
	{
		id: 'boil-time',
		stage: 'boil',
		ask: 'How long do you boil it for?',
		hint: 'The kettle goes on and comes up to a rolling boil. That boil sterilises the wort, drives off raw grain smells and concentrates the sugar left in it — and it is the only thing that turns hop resin bitter, which is why hops go in here and nowhere else.'
	},
	{
		id: 'kettle-hops',
		stage: 'boil',
		ask: 'What goes in the kettle?',
		hint: 'Now the hops, with the clock running. They all end up in the same beer; what differs is when. An hour of boiling turns the resin bitter and drives the smell off entirely, so an early charge is pure bitterness. The last few minutes do the opposite. That is why a recipe usually has two or three charges rather than one.'
	},
	{
		id: 'flameout-hops',
		stage: 'boil',
		ask: 'Anything after the flame goes out?',
		hint: 'The timer runs out and you kill the heat. The wort is still near boiling, so hops dropped in now steep rather than boil — the smell survives where a full boil would have destroyed it. Optional, and where most of the aroma in a modern hoppy beer comes from.',
		optional: true
	},
	{
		id: 'chill-method',
		stage: 'chill',
		ask: 'How are you cooling it down?',
		hint: 'From boiling down to a temperature yeast can live at, as quickly as you reasonably can. Between about 60 °C and the end the wort is warm sugar water with nothing defending it — no heat, no alcohol, nothing — so every extra minute is a minute something else could get in first. Treat the bars below as odds rather than prophecy.'
	},
	{
		id: 'transfer',
		stage: 'chill',
		ask: 'How carefully does it go into the fermenter?',
		hint: 'You siphon the cooled wort off the sludge of spent hops and settled protein and into a clean bucket. Everything it touches from here has been sanitised, because the beer has no heat defending it any more. How gently it goes across decides how much air goes in with it.'
	},
	{
		id: 'yeast',
		stage: 'ferment',
		ask: 'Which yeast?',
		hint: 'The wort is sitting in the bucket, cool and still, and it is not beer yet — it is sweet malt tea. Yeast is what changes that: it eats the sugar, makes the alcohol, and on the way makes much of what the beer will taste of. The percentage on each card is how much of the sugar that strain will eat, so how dry it finishes. Flocculation is how readily it clumps and sinks when it is done, which decides how clear the beer ends up.'
	},
	{
		id: 'ferment-schedule',
		stage: 'ferment',
		ask: 'How warm, and for how long?',
		hint: 'You sprinkle the yeast on top, seal the lid with an airlock and put the bucket somewhere the temperature does not swing. Within a day it is bubbling, and then you leave it alone for a week or three. Cool keeps the yeast quiet and the beer clean; warm brings out fruit and spice, and past a point a harsh taste of solvent that never ages out. This is also what you chilled down to — you pitch at or just below where you mean to hold it.'
	},
	{
		id: 'dry-hops',
		stage: 'ferment',
		ask: 'Any hops into the fermenter?',
		hint: 'Partway through, once the vigorous bubbling has died down, you can lift the lid and drop hops straight into the cold beer. No heat at all, so they buy no bitterness whatsoever — only smell. Skip it and nothing is lost; a modern IPA lives on it.',
		optional: true
	},
	{
		id: 'cold-crash',
		stage: 'ferment',
		ask: 'Chill it clear before packaging?',
		hint: 'Fermentation is over and the beer is cloudy with spent yeast. Move the bucket somewhere near freezing for a couple of days and most of it settles out, so what you pour is clear. Only worth doing once it is genuinely finished — chill it early and the yeast stops before it has cleaned up after itself.',
		optional: true
	},
	{
		id: 'packaging',
		stage: 'condition',
		ask: 'Bottles or a keg?',
		hint: 'The beer is made. Now it has to get into something you can drink out of, and it has to get its fizz, and those are the same job done two different ways.'
	},
	{
		id: 'carbonation',
		stage: 'condition',
		ask: 'How fizzy should it be?',
		hint: 'Fizz is not a formality. It carries the smell up out of the glass, sharpens the bitterness and makes a beer feel lighter than its strength suggests. A supermarket lager sits around 2.4 volumes of gas; cask ale is nearly flat next to it and a Belgian saison is sharper than either.'
	},
	{
		id: 'storage',
		stage: 'condition',
		ask: 'How long does it sit, and how cold?',
		hint: 'Then you wait, and two clocks run at once. Time softens the alcohol, settles the last of the yeast and knits the malt together — and the same time lets hop smell fade and oxygen do its slow damage. Which clock matters depends entirely on what you have made.'
	},
	{
		id: 'taste',
		stage: 'taste',
		ask: 'What did you make?',
		hint: 'You open one, pour it into a glass, and find out.'
	}
];

export const QUESTION_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

export function questionIndex(id: string): number {
	return QUESTIONS.findIndex((q) => q.id === id);
}

/** The questions belonging to one stage, in order. */
export function questionsForStage(stage: StageId): Question[] {
	return QUESTIONS.filter((q) => q.stage === stage);
}

/** Index of the first question of a stage, for jumping back to a phase. */
export function firstQuestionOf(stage: StageId): number {
	return QUESTIONS.findIndex((q) => q.stage === stage);
}

/** True when answering this question completes its stage. */
export function isLastOfStage(index: number): boolean {
	const here = QUESTIONS[index];
	const next = QUESTIONS[index + 1];
	return !next || next.stage !== here.stage;
}

/**
 * The last question index a brew that has carried out `brewedTo` stages may
 * reach: everything in the stages already done, plus all of the next stage's
 * questions, because that is the stage being worked on.
 */
export function reachableThrough(brewedTo: number): number {
	const nextStage = STAGES[brewedTo + 1];
	if (!nextStage) return QUESTIONS.length - 1;
	const last = QUESTIONS.map((q, i) => ({ q, i })).filter(
		({ q }) => stageIndex(q.stage) <= stageIndex(nextStage.id)
	);
	return last.length ? last[last.length - 1].i : QUESTIONS.length - 1;
}
