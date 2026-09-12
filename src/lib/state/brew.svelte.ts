import type { Recipe, StoredRecipe } from '$lib/brewing/types';
import { simulate } from '$lib/brewing/simulate';
import { buildContext } from '$lib/brewing/simulate';
import { defaultRecipe, newId } from '$lib/brewing/recipes';
import { CHALLENGE_BY_ID, evaluateChallenge } from '$lib/brewing/challenges';
import { loadProgress, saveProgress, type StoredProgress } from '$lib/persist/recipes';
import type { StageId } from './stages';

export type BrewMode = 'free' | 'style' | 'challenge';

/**
 * The single source of truth for the current brew.
 *
 * The engine is pure, so everything derived from the recipe is a `$derived`
 * and recalculates the moment any control moves.
 */
class BrewStore {
	recipe = $state<Recipe>(defaultRecipe());
	stage = $state<StageId>('water');
	mode = $state<BrewMode>('free');
	challengeId = $state<string | undefined>(undefined);
	/** The saved recipe this brew came from, when there is one. */
	stored = $state<StoredRecipe | undefined>(undefined);
	progress = $state<StoredProgress>({});
	/** Set once the autosave has been read, so we do not overwrite it with defaults. */
	hydrated = $state(false);

	result = $derived(simulate(this.recipe));
	context = $derived(buildContext(this.recipe));

	challenge = $derived(this.challengeId ? CHALLENGE_BY_ID.get(this.challengeId) : undefined);
	challengeEvaluation = $derived(
		this.challenge ? evaluateChallenge(this.challenge, this.result, this.recipe) : undefined
	);

	load(recipe: Recipe, stored?: StoredRecipe) {
		this.recipe = structuredClone(recipe);
		this.stored = stored;
	}

	/** Mutate the recipe through one place so every change is reactive. */
	update(mutate: (recipe: Recipe) => void) {
		mutate(this.recipe);
	}

	setStage(stage: StageId) {
		this.stage = stage;
	}

	startChallenge(id: string, recipe: Recipe) {
		this.challengeId = id;
		this.mode = 'challenge';
		this.recipe = structuredClone(recipe);
		this.stored = undefined;
		this.stage = 'water';
	}

	leaveChallenge() {
		this.challengeId = undefined;
		this.mode = 'free';
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
