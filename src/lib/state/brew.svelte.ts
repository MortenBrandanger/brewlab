import type { Recipe, StoredRecipe } from '$lib/brewing/types';
import { buildContext, simulate } from '$lib/brewing/simulate';
import { emptyRecipe, newId } from '$lib/brewing/recipes';
import { CHALLENGE_BY_ID, evaluateChallenge } from '$lib/brewing/challenges';
import { targetRows, type TargetKey } from '$lib/brewing/target';
import { loadProgress, saveProgress, type StoredProgress } from '$lib/persist/recipes';
import { STAGES, stageIndex, revealedAt, type Reveal, type StageId } from './stages';
import {
	QUESTIONS,
	firstQuestionOf,
	isLastOfStage,
	reachableThrough,
	type Question
} from './questions';

export type BrewMode = 'free' | 'style' | 'challenge';

/**
 * The single source of truth for the current brew.
 *
 * Two separate things are tracked. The recipe is what the beer *would* be, and
 * the engine recalculates it the instant any control moves. `brewedTo` is how
 * far the brew day has actually got, and it gates what the simulator is willing
 * to claim: there is no gravity before the mash and no alcohol before
 * fermentation. Progress only ever moves forward, so going back to change
 * something never costs the user anything.
 */
class BrewStore {
	recipe = $state<Recipe>(emptyRecipe());
	stage = $state<StageId>('water');
	mode = $state<BrewMode>('free');
	challengeId = $state<string | undefined>(undefined);
	/** The saved recipe this brew came from, when there is one. */
	stored = $state<StoredRecipe | undefined>(undefined);
	progress = $state<StoredProgress>({});
	/** Set once the autosave has been read, so we do not overwrite it with defaults. */
	hydrated = $state(false);
	/** False until the user has chosen how to begin. */
	started = $state(false);
	/**
	 * Index of the last stage actually carried out. -1 means nothing has been
	 * done yet: there is water in a tank and no beer anywhere.
	 */
	brewedTo = $state(-1);

	result = $derived(simulate(this.recipe));
	context = $derived(buildContext(this.recipe));

	challenge = $derived(this.challengeId ? CHALLENGE_BY_ID.get(this.challengeId) : undefined);
	challengeEvaluation = $derived(
		this.challenge ? evaluateChallenge(this.challenge, this.result, this.recipe) : undefined
	);

	/** True once the brew has reached the point where this number means anything. */
	knows(reveal: Reveal): boolean {
		return this.brewedTo >= revealedAt(reveal);
	}

	/**
	 * The beer you are heading for against the beer you said you wanted,
	 * computed once for the style panel, the watch list, the kettle readout and
	 * the report. Each row knows whether the brew day has made it true yet or
	 * whether it is still a projection, and the panels decide what to do with
	 * that; the comparison itself is the same everywhere.
	 */
	target = $derived.by(() => {
		// A plain Set built and read inside one derived; nothing observes it.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const settled = new Set<TargetKey>();
		if (this.knows('gravity')) settled.add('og');
		if (this.knows('colour')) settled.add('ebc');
		if (this.knows('bitterness')) settled.add('ibu');
		if (this.knows('alcohol')) {
			settled.add('fg');
			settled.add('abv');
		}
		return targetRows(this.recipe, this.result.metrics, settled);
	});

	/** The stage currently being worked on, as an index. */
	get stageIdx(): number {
		return stageIndex(this.stage);
	}

	/** True when this stage has already been carried out. */
	isDone(stage: StageId): boolean {
		return this.brewedTo >= stageIndex(stage);
	}

	/** The next stage that has not been done yet. */
	get nextStage(): StageId | undefined {
		return STAGES[this.brewedTo + 1]?.id;
	}

	/** Why the current stage's action is not available yet, if it is not. */
	blockedBecause(stage: StageId): string | undefined {
		const meta = STAGES[stageIndex(stage)];
		if (!meta?.requires) return undefined;
		if (meta.requires === 'water' && !this.recipe.water.profileId) {
			return 'Choose a water first. There is nothing in the pot to heat.';
		}
		if (meta.requires === 'hops' && this.recipe.hops.length === 0) {
			return 'Add at least one hop first. An unhopped boil leaves sweet wort, not beer.';
		}
		if (meta.requires === 'yeast' && !this.recipe.fermentation.yeastId) {
			return 'Choose a yeast first. Nothing ferments without it.';
		}
		if (meta.requires === 'fermentables' && this.recipe.fermentables.length === 0) {
			return 'Add a malt first. There is nothing to mill.';
		}
		if (meta.requires === 'conversion' && this.context?.mash.conversionMinutes === 0) {
			return 'No mash step sits in the conversion range, so nothing would convert.';
		}
		if (
			meta.alsoRequires === 'landing' &&
			this.recipe.mash.landedTempC === undefined &&
			this.recipe.mash.toppedUpL === undefined
		) {
			return 'Read the thermometer first: top it up, or live with where it landed.';
		}
		return undefined;
	}

	/**
	 * The stage just carried out, for the panel to play back. Cleared when the
	 * playback ends or the reader moves on; never restored from storage,
	 * because a playback is of the act of pressing the button.
	 */
	justDid = $state<{ stage: StageId; at: number } | undefined>(undefined);

	/** Carry out the current stage and move to the next one. */
	commit(stage: StageId): StageId | undefined {
		const index = stageIndex(stage);
		if (this.blockedBecause(stage)) return undefined;
		const first = this.brewedTo < index;
		this.brewedTo = Math.max(this.brewedTo, index);
		// Only the first time through: re-committing a stage after going back
		// to change something is an edit, not a brew day.
		this.justDid = first ? { stage, at: Date.now() } : undefined;
		const next = STAGES[index + 1];
		if (next) {
			this.stage = next.id;
			this.at = firstQuestionOf(next.id);
		}
		return next?.id;
	}

	/**
	 * Pick up exactly where the last session left off, including which stage was
	 * open. Landing a finished beer on stage one reads as if the app brewed it
	 * for you.
	 */
	resume(recipe: Recipe, brewedTo: number, stage?: string) {
		this.recipe = structuredClone(recipe);
		this.stored = undefined;
		this.brewedTo = Math.max(-1, Math.min(STAGES.length - 1, brewedTo));
		const known = STAGES.find((s) => s.id === stage);
		this.stage = known?.id ?? STAGES[Math.max(0, Math.min(STAGES.length - 1, this.brewedTo))].id;
		this.at = firstQuestionOf(this.stage);
		this.started = true;
	}

	load(recipe: Recipe, stored?: StoredRecipe, brewedTo = STAGES.length - 1) {
		this.recipe = structuredClone(recipe);
		this.stored = stored;
		this.brewedTo = brewedTo;
		this.at = firstQuestionOf(this.stage);
		this.started = true;
	}

	/** A blank brew day: water in the tank and nothing else. */
	/**
	 * @param targetStyleId the beer being brewed towards, or undefined for a brew
	 * with no target. It is asked before the first stage rather than left in a
	 * header dropdown: every stage from the water onwards describes itself in
	 * terms of the beer you are making, so without an answer none of them can.
	 */
	startFresh(targetStyleId?: string) {
		this.recipe = emptyRecipe();
		this.recipe.targetStyleId = targetStyleId;
		this.stored = undefined;
		this.brewedTo = -1;
		this.stage = 'water';
		this.at = 0;
		this.started = true;
		// leaveChallenge derives the mode from the target we just set.
		this.leaveChallenge();
	}

	/** Which of the brew day's questions is on screen. */
	at = $state(0);

	get question(): Question {
		return QUESTIONS[Math.min(this.at, QUESTIONS.length - 1)];
	}

	/** Answering the last question of a stage is what carries that stage out. */
	get endsStage(): boolean {
		return isLastOfStage(this.at);
	}

	/**
	 * Forward stops at the end of the stage being worked on. Back is free, the
	 * way changing your mind about the grain and watching what it does is the
	 * whole point of a simulator.
	 */
	goTo(index: number) {
		const limit = reachableThrough(this.brewedTo);
		this.at = Math.max(0, Math.min(index, limit));
		this.stage = QUESTIONS[this.at].stage;
	}

	next() {
		this.goTo(this.at + 1);
	}

	back() {
		this.goTo(this.at - 1);
	}

	/**
	 * Going back is free; going forward stops at the next undone stage. The
	 * navigator styles the road ahead as unreachable, but this is what enforces
	 * it, so a link from the report or a restored session cannot step past the
	 * brew day either.
	 */
	setStage(stage: StageId) {
		const allowed = STAGES[Math.min(stageIndex(stage), this.brewedTo + 1)].id;
		this.stage = allowed;
		this.at = firstQuestionOf(allowed);
	}

	startChallenge(id: string, recipe: Recipe, fromScratch: boolean) {
		this.challengeId = id;
		this.mode = 'challenge';
		this.recipe = structuredClone(recipe);
		this.stored = undefined;
		this.stage = 'water';
		// A repair challenge hands you a finished beer to fix; the others start
		// on an empty brew day.
		this.brewedTo = fromScratch ? -1 : STAGES.length - 1;
		this.started = true;
	}

	leaveChallenge() {
		this.challengeId = undefined;
		this.mode = this.recipe.targetStyleId ? 'style' : 'free';
	}

	async hydrateProgress() {
		this.progress = await loadProgress();
	}

	/** Record a completed challenge, keeping the best overall score. */
	async recordProgress() {
		const evaluation = this.challengeEvaluation;
		if (!evaluation?.complete || !this.challengeId) return;
		const previous = this.progress[this.challengeId];
		if (previous && previous.bestOverall >= this.result.scores.overall) return;
		this.progress = {
			...this.progress,
			[this.challengeId]: {
				completedAt: previous?.completedAt ?? new Date().toISOString(),
				bestOverall: this.result.scores.overall
			}
		};
		await saveProgress(this.progress);
	}
}

export const brew = new BrewStore();

export { newId };
