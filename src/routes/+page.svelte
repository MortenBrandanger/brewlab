<script lang="ts">
	import QuestionRail from '$lib/components/QuestionRail.svelte';
	import WhyThis from '$lib/components/WhyThis.svelte';
	import QuestionView from '$lib/components/QuestionView.svelte';
	import QuestionFooter from '$lib/components/QuestionFooter.svelte';
	import BeerMonitor from '$lib/components/BeerMonitor.svelte';
	import BreweryScene from '$lib/components/BreweryScene.svelte';
	import StartScreen from '$lib/components/StartScreen.svelte';
	import StyleGuidance from '$lib/components/StyleGuidance.svelte';
	import ChallengePanel from '$lib/components/ChallengePanel.svelte';
	import RecipeActions from '$lib/components/RecipeActions.svelte';
	import { hazeFor } from '$lib/brewing/appearance';
	import { STAGES, STAGE_BY_ID, type StageId } from '$lib/state/stages';
	import { forecastAbv } from '$lib/brewing/forecast';
	import { QUESTIONS, questionsForStage } from '$lib/state/questions';
	import { brew } from '$lib/state/brew.svelte';

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

	/** The bottom bar on a phone says what the panel's headline says. */
	const mobileStatus = $derived(
		brew.brewedTo < 0
			? 'Nothing brewed yet. The water is on.'
			: brew.brewedTo >= STAGES.length - 1
				? brew.result.verdict.headline
				: (STAGES[brew.brewedTo]?.done ?? '')
	);
	const mobileForecast = $derived.by(() => {
		if (brew.knows('judgement')) return undefined;
		const f = forecastAbv(brew.recipe);
		if (!f) return undefined;
		return f.open
			? `Heading for ${f.low.toFixed(1)}–${f.high.toFixed(1)}% alcohol`
			: `Heading for ${f.low.toFixed(1)}% alcohol`;
	});
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
					<!--
						The text keeps a readable measure: below about 18rem of room the
						illustration wraps underneath rather than squeezing the hint into a
						thirty-character column, which is what it did on a phone.
					-->
					<div class="flex flex-wrap items-start justify-between gap-4">
						<div class="min-w-0 flex-1 basis-[18rem]">
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
							<!--
								The stage's "why" sits at the end of the line it elaborates, as a
								question mark you press — the same affordance a figure uses. It
								used to be a disclosure at the foot of the page, below the
								controls and below the action.
							-->
							<p class="prose-measure relative mt-2 text-sm text-muted">
								{question.hint ?? ''}<WhyThis stage={question.stage} />
							</p>
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
			<!--
				Where the brew day has got to, in words, and where it is heading. This
				bar used to read "OG 1.054 ABV 5.7% IBU 13 EBC 10" — the same column
				of bare abbreviations the desktop panel folded away because nobody
				learned anything from it.
			-->
			<span class="flex min-w-0 flex-1 flex-col gap-0.5 text-xs">
				<span class="truncate text-fg">{mobileStatus}</span>
				{#if mobileForecast}
					<span class="tnum truncate text-subtle">{mobileForecast}</span>
				{:else}
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
