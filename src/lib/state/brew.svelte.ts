import type { Recipe, StoredRecipe } from '$lib/brewing/types';
import { buildContext, simulate } from '$lib/brewing/simulate';
import { emptyRecipe, newId } from '$lib/brewing/recipes';
import { CHALLENGE_BY_ID, evaluateChallenge } from '$lib/brewing/challenges';
import { loadProgress, saveProgress, type StoredProgress } from '$lib/persist/recipes';
import { STAGES, stageIndex, revealedAt, type Reveal, type StageId } from './stages';

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
		if (meta.requires === 'fermentables' && this.recipe.fermentables.length === 0) {
			return 'Add at least one fermentable first. There is nothing to mill.';
		}
		if (meta.requires === 'conversion' && this.context?.mash.conversionMinutes === 0) {
			return 'No mash step sits in the conversion range, so nothing would convert.';
		}
		return undefined;
	}

	/** Carry out the current stage and move to the next one. */
	commit(stage: StageId): StageId | undefined {
		const index = stageIndex(stage);
		if (this.blockedBecause(stage)) return undefined;
		this.brewedTo = Math.max(this.brewedTo, index);
		const next = STAGES[index + 1];
		if (next) this.stage = next.id;
		return next?.id;
	}

	load(recipe: Recipe, stored?: StoredRecipe, brewedTo = STAGES.length - 1) {
		this.recipe = structuredClone(recipe);
		this.stored = stored;
		this.brewedTo = brewedTo;
		this.started = true;
	}

	/** A blank brew day: water in the tank and nothing else. */
	startFresh() {
		this.recipe = emptyRecipe();
		this.stored = undefined;
		this.brewedTo = -1;
		this.stage = 'water';
		this.started = true;
		this.leaveChallenge();
	}

	setStage(stage: StageId) {
		this.stage = stage;
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
