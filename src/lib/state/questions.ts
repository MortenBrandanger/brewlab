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
		hint: 'Tap water is different everywhere, and it changes how the beer tastes. Pick the one that suits what you are making, or mix your own.'
	},
	{
		id: 'grain-malts',
		stage: 'grain',
		ask: 'What malt goes in?',
		hint: 'This is the beer. Four or five kilos, mostly one base malt, with smaller amounts of darker ones for colour and flavour.'
	},
	{
		id: 'mash-finish',
		stage: 'mash',
		ask: 'How do you want it to finish?',
		hint: 'The temperature you hold the grain at decides how much of its sugar the yeast can eat, and so whether the beer ends up thin and crisp or full and sweet.'
	},
	{
		id: 'batch-size',
		stage: 'sparge',
		ask: 'How much beer do you want?',
		hint: 'The size of the batch. Everything else scales to hit it.'
	},
	{
		id: 'sparge-stop',
		stage: 'sparge',
		ask: 'When do you stop collecting?',
		hint: 'You keep rinsing the grain and draining into the kettle until it holds this much. Collect more than your batch size, because the boil takes some away.'
	},
	{
		id: 'boil-time',
		stage: 'boil',
		ask: 'How long do you boil it for?'
	},
	{
		id: 'kettle-hops',
		stage: 'boil',
		ask: 'What goes in the kettle?',
		hint: 'Hops boiled for a long time turn bitter. This is where almost all the bitterness in the beer comes from — and where aroma is destroyed.'
	},
	{
		id: 'flameout-hops',
		stage: 'boil',
		ask: 'Anything after the flame goes out?',
		hint: 'The kettle is off the heat but still hot, so hops steep rather than boil. Flavour and aroma survive here.',
		optional: true
	},
	{
		id: 'chill-method',
		stage: 'chill',
		ask: 'How are you cooling it down?',
		hint: 'From boiling to the temperature yeast can live at. Every minute in between is a minute something else could take hold.'
	},
	{
		id: 'pitch-temp',
		stage: 'chill',
		ask: 'How cold before the yeast goes in?'
	},
	{
		id: 'transfer',
		stage: 'chill',
		ask: 'How carefully does it go into the fermenter?',
		hint: 'Everything it touches from here has been sanitised. The beer has no heat defending it any more.'
	},
	{
		id: 'yeast',
		stage: 'ferment',
		ask: 'Which yeast?',
		hint: 'The yeast eats the sugar and makes the alcohol, and along the way it makes much of what the beer tastes of.'
	},
	{
		id: 'ferment-schedule',
		stage: 'ferment',
		ask: 'How warm, and for how long?',
		hint: 'Cool keeps the yeast quiet and the beer clean. Warm brings out fruit and spice, and past a point, a harsh taste of solvent.'
	},
	{
		id: 'dry-hops',
		stage: 'ferment',
		ask: 'Any hops into the fermenter?',
		hint: 'Loose hops dropped in cold, partway through. Pure aroma — they add no bitterness at all.',
		optional: true
	},
	{
		id: 'cold-crash',
		stage: 'ferment',
		ask: 'Chill it clear before packaging?',
		hint: 'A couple of days near freezing once fermentation has finished. Yeast and haze settle out and the beer pours clear.',
		optional: true
	},
	{
		id: 'packaging',
		stage: 'condition',
		ask: 'Bottles or a keg?'
	},
	{
		id: 'carbonation',
		stage: 'condition',
		ask: 'How fizzy should it be?'
	},
	{
		id: 'storage',
		stage: 'condition',
		ask: 'How long does it sit, and how cold?',
		hint: 'Time softens some beers and ruins others. Which one yours is depends on what you have made.'
	},
	{
		id: 'taste',
		stage: 'taste',
		ask: 'What did you make?'
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
