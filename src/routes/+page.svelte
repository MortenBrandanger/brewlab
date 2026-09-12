<script lang="ts">
	import ProcessNavigator from '$lib/components/ProcessNavigator.svelte';
	import BeerMonitor from '$lib/components/BeerMonitor.svelte';
	import BreweryScene from '$lib/components/BreweryScene.svelte';
	import StyleGuidance from '$lib/components/StyleGuidance.svelte';
	import ChallengePanel from '$lib/components/ChallengePanel.svelte';
	import WaterStage from '$lib/components/stages/WaterStage.svelte';
	import GrainStage from '$lib/components/stages/GrainStage.svelte';
	import MashStage from '$lib/components/stages/MashStage.svelte';
	import SpargeStage from '$lib/components/stages/SpargeStage.svelte';
	import BoilStage from '$lib/components/stages/BoilStage.svelte';
	import ChillStage from '$lib/components/stages/ChillStage.svelte';
	import FermentStage from '$lib/components/stages/FermentStage.svelte';
	import ConditionStage from '$lib/components/stages/ConditionStage.svelte';
	import TasteStage from '$lib/components/stages/TasteStage.svelte';
	import RecipeActions from '$lib/components/RecipeActions.svelte';
	import { hazeFor } from '$lib/brewing/appearance';
	import { STAGES, STAGE_BY_ID, stageIndex, type StageId } from '$lib/state/stages';
	import { brew } from '$lib/state/brew.svelte';

	const stage = $derived(STAGE_BY_ID.get(brew.stage)!);
	const index = $derived(stageIndex(brew.stage));
	const accent = $derived(
		{ copper: 'var(--color-copper)', amber: 'var(--color-amber)', hop: 'var(--color-hop)' }[
			stage.accent
		]
	);

	let monitorDialog = $state<HTMLDialogElement>();
	let stageHeading = $state<HTMLElement>();

	function go(next: StageId) {
		brew.setStage(next);
		// Move focus to the new stage so keyboard and screen-reader users land in it.
		queueMicrotask(() => stageHeading?.focus());
	}
</script>

<svelte:head>
	<title>{brew.recipe.name} — BrewLab</title>
</svelte:head>

<ProcessNavigator current={brew.stage} onselect={go} />

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
						<p class="field-label">Stage {index + 1} of {STAGES.length}</p>
						<h1
							bind:this={stageHeading}
							tabindex="-1"
							class="mt-1 font-display text-xl focus-visible:outline-2 focus-visible:outline-amber"
						>
							{stage.name}
						</h1>
						<p class="prose-measure mt-2 text-sm text-muted">{stage.lead}</p>
					</div>
					<BreweryScene
						stage={brew.stage}
						srm={brew.result.metrics.srm}
						haze={hazeFor(brew.recipe)}
					/>
				</div>

				<hr class="my-5 border-line" />

				{#if brew.stage === 'water'}
					<WaterStage />
				{:else if brew.stage === 'grain'}
					<GrainStage />
				{:else if brew.stage === 'mash'}
					<MashStage />
				{:else if brew.stage === 'sparge'}
					<SpargeStage />
				{:else if brew.stage === 'boil'}
					<BoilStage />
				{:else if brew.stage === 'chill'}
					<ChillStage />
				{:else if brew.stage === 'ferment'}
					<FermentStage />
				{:else if brew.stage === 'condition'}
					<ConditionStage />
				{:else}
					<TasteStage onadjust={go} />
				{/if}
			</section>

			<nav class="flex items-center justify-between gap-3" aria-label="Move between stages">
				<button
					type="button"
					class="btn btn-ghost"
					disabled={index === 0}
					onclick={() => go(STAGES[index - 1].id)}
				>
					<svg viewBox="0 0 16 16" class="h-4 w-4" aria-hidden="true">
						<path
							d="M10 3.5 L5 8 L10 12.5"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
						/>
					</svg>
					{index > 0 ? STAGES[index - 1].name : 'Back'}
				</button>
				{#if index < STAGES.length - 1}
					<button type="button" class="btn btn-primary" onclick={() => go(STAGES[index + 1].id)}>
						{STAGES[index + 1].name}
						<svg viewBox="0 0 16 16" class="h-4 w-4" aria-hidden="true">
							<path
								d="M6 3.5 L11 8 L6 12.5"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
							/>
						</svg>
					</button>
				{:else}
					<button type="button" class="btn btn-primary" onclick={() => go('water')}
						>Brew again</button
					>
				{/if}
			</nav>

			<RecipeActions />
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
		onclick={() => {
			monitorDialog?.showModal();
		}}
	>
		<span class="tnum flex flex-1 flex-wrap gap-x-4 text-xs">
			<span><span class="text-subtle">OG</span> {brew.result.metrics.og.toFixed(3)}</span>
			<span><span class="text-subtle">ABV</span> {brew.result.metrics.abv.toFixed(1)}%</span>
			<span><span class="text-subtle">IBU</span> {Math.round(brew.result.metrics.ibu)}</span>
			<span><span class="text-subtle">EBC</span> {Math.round(brew.result.metrics.ebc)}</span>
		</span>
		<span class="chip">Your beer</span>
	</button>
</div>

<!-- A native dialog gives focus trapping, Escape and the backdrop for free. -->
<dialog
	bind:this={monitorDialog}
	class="no-print m-0 max-h-[85dvh] w-full max-w-none translate-y-0 self-end overflow-y-auto rounded-t-xl bg-surface-2 p-0 text-fg backdrop:bg-surface/80 lg:hidden"
	style="margin-top:auto"
	aria-label="Your beer"
>
	<div class="sticky top-0 flex justify-end bg-surface-2 p-2">
		<button type="button" class="btn btn-ghost h-10" onclick={() => monitorDialog?.close()}
			>Close</button
		>
	</div>
	<BeerMonitor />
</dialog>
