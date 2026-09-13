<script lang="ts">
	import QuestionRail from '$lib/components/QuestionRail.svelte';
	import QuestionView from '$lib/components/QuestionView.svelte';
	import QuestionFooter from '$lib/components/QuestionFooter.svelte';
	import BeerMonitor from '$lib/components/BeerMonitor.svelte';
	import BreweryScene from '$lib/components/BreweryScene.svelte';
	import StartScreen from '$lib/components/StartScreen.svelte';
	import StyleGuidance from '$lib/components/StyleGuidance.svelte';
	import ChallengePanel from '$lib/components/ChallengePanel.svelte';
	import RecipeActions from '$lib/components/RecipeActions.svelte';
	import { hazeFor } from '$lib/brewing/appearance';
	import { STAGE_BY_ID, type StageId } from '$lib/state/stages';
	import { QUESTIONS, questionsForStage } from '$lib/state/questions';
	import { brew } from '$lib/state/brew.svelte';
	import { prefs } from '$lib/state/prefs.svelte';

	const stage = $derived(STAGE_BY_ID.get(brew.stage)!);
	const accent = $derived(
		{ copper: 'var(--color-copper)', amber: 'var(--color-amber)', hop: 'var(--color-hop)' }[
			stage.accent
		]
	);

	let monitorDialog = $state<HTMLDialogElement>();
	let stageHeading = $state<HTMLElement>();

	const question = $derived(brew.question);
	/** "Question 2 of 3" inside the stage, which is the honest unit of progress. */
	const within = $derived(questionsForStage(question.stage));
	const withinIndex = $derived(within.findIndex((q) => q.id === question.id));

	function focusQuestion() {
		// Land keyboard and screen-reader users on the new question, not the top.
		queueMicrotask(() => stageHeading?.focus());
	}

	function go(next: StageId) {
		brew.setStage(next);
		focusQuestion();
	}
</script>

<svelte:head>
	<title
		>{brew.started
			? `${brew.recipe.name} — BrewLab`
			: 'BrewLab — brew a beer in the browser'}</title
	>
</svelte:head>

{#if !brew.started}
	<main id="main" class="flex flex-1 flex-col">
		<StartScreen />
	</main>
{:else}
	<QuestionRail />

	<main id="main" class="mx-auto w-full max-w-[100rem] flex-1 px-3 pb-28 sm:px-5 lg:pb-10">
		<div class="grid gap-5 py-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
			<div class="flex min-w-0 flex-col gap-5" style="--stage-accent:{accent}">
				{#if brew.challenge}
					<ChallengePanel />
				{/if}
				{#if brew.recipe.targetStyleId && brew.stage !== 'taste'}
					<StyleGuidance />
				{/if}

				<section class="panel p-4 sm:p-6">
					<div class="flex flex-wrap items-start justify-between gap-4">
						<div class="min-w-0 flex-1">
							<p class="field-label">
								{stage.name}
								{#if within.length > 1}
									· {withinIndex + 1} of {within.length}
								{/if}
							</p>
							<h1
								bind:this={stageHeading}
								tabindex="-1"
								class="mt-1 font-display text-xl focus-visible:outline-2 focus-visible:outline-amber"
							>
								{question.ask}
							</h1>
							{#if question.hint}
								<p class="prose-measure mt-2 text-sm text-muted">{question.hint}</p>
							{/if}
						</div>
						<BreweryScene
							stage={brew.stage}
							srm={brew.result.metrics.srm}
							haze={hazeFor(brew.recipe)}
						/>
					</div>

					<hr class="my-5 border-line" />

					<QuestionView id={question.id} onadjust={go} />
				</section>

				{#if stage.what && prefs.showWhy}
					<details class="group">
						<summary
							class="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-sm py-1 text-sm font-medium text-copper-text hover:underline"
						>
							<svg
								viewBox="0 0 16 16"
								class="h-3.5 w-3.5 transition-transform group-open:rotate-90"
								aria-hidden="true"
							>
								<path
									d="M6 3.5 L11 8 L6 12.5"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
								/>
							</svg>
							Why {stage.name.toLowerCase()} matters
						</summary>
						<p class="prose-measure mt-1.5 text-sm text-muted">{stage.what}</p>
						{#if stage.deepDive}
							<p class="prose-measure mt-2.5 text-sm text-subtle">{stage.deepDive}</p>
						{/if}
					</details>
				{/if}

				<QuestionFooter onmoved={focusQuestion} />

				{#if brew.stage === 'taste'}
					<RecipeActions />
				{/if}
			</div>

			<!-- Monitor: a sidebar on desktop, a sheet on small screens. -->
			<aside class="hidden lg:block">
				<div class="panel sticky top-4">
					<BeerMonitor />
				</div>
			</aside>
		</div>
	</main>

	<!-- Small screens: sticky summary that opens the full monitor. -->
	<div class="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-2 lg:hidden">
		<button
			type="button"
			class="flex min-h-14 w-full items-center gap-4 px-4 text-start"
			onclick={() => monitorDialog?.showModal()}
		>
			<span class="tnum flex flex-1 flex-wrap gap-x-4 text-xs">
				{#if brew.knows('gravity')}
					<span><span class="text-subtle">OG</span> {brew.result.metrics.og.toFixed(3)}</span>
				{/if}
				{#if brew.knows('alcohol')}
					<span><span class="text-subtle">ABV</span> {brew.result.metrics.abv.toFixed(1)}%</span>
				{/if}
				{#if brew.knows('bitterness')}
					<span><span class="text-subtle">IBU</span> {Math.round(brew.result.metrics.ibu)}</span>
				{/if}
				{#if brew.knows('colour')}
					<span><span class="text-subtle">EBC</span> {Math.round(brew.result.metrics.ebc)}</span>
				{/if}
				{#if !brew.knows('colour')}
					<span class="text-subtle">{brew.at + 1} of {QUESTIONS.length}</span>
				{/if}
			</span>
			<span class="chip">{brew.knows('judgement') ? 'Your beer' : 'Brew day'}</span>
		</button>
	</div>

	<!-- A native dialog gives focus trapping, Escape and the backdrop for free. -->
	<dialog
		bind:this={monitorDialog}
		class="no-print fixed inset-x-0 top-auto bottom-0 m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-xl bg-surface-2 p-0 text-fg backdrop:bg-surface/80 lg:hidden"
		aria-label="Brew day"
	>
		<div class="sticky top-0 flex justify-end bg-surface-2 p-2">
			<button type="button" class="btn btn-ghost h-10" onclick={() => monitorDialog?.close()}
				>Close</button
			>
		</div>
		<BeerMonitor />
	</dialog>
{/if}
