<script lang="ts">
	import { brew } from '$lib/state/brew.svelte';
	import { STAGES, stageIndex, type StageId } from '$lib/state/stages';

	let { stage, ongo }: { stage: StageId; ongo: (next: StageId) => void } = $props();

	const meta = $derived(STAGES[stageIndex(stage)]);
	const done = $derived(brew.isDone(stage));
	const blocked = $derived(brew.blockedBecause(stage));
	const next = $derived(STAGES[stageIndex(stage) + 1]);
	/** Doing a stage out of order would skip the ones before it. */
	const outOfOrder = $derived(!done && brew.brewedTo < stageIndex(stage) - 1);

	function act() {
		const moved = brew.commit(stage);
		if (moved) ongo(moved);
	}
</script>

<section
	class="rounded-lg border p-4 transition-colors {done
		? 'border-line bg-surface'
		: 'border-copper-dim bg-copper-dim/15'}"
>
	{#if done}
		<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
			<span class="flex items-center gap-1.5 text-sm font-medium text-hop">
				<svg viewBox="0 0 16 16" class="h-4 w-4" aria-hidden="true">
					<path
						d="M3.5 8.5 L6.5 11.5 L12.5 4.5"
						fill="none"
						stroke="currentColor"
						stroke-width="2.2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
				{meta.done}
			</span>
			{#if next}
				<button type="button" class="btn btn-primary ms-auto" onclick={() => ongo(next.id)}>
					Next: {next.name}
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
			{/if}
		</div>
	{:else}
		<div class="flex flex-wrap items-center gap-x-4 gap-y-3">
			<div class="min-w-[14rem] flex-1">
				<p class="font-display text-sm font-semibold">{meta.action}</p>
				<p class="prose-measure mt-0.5 text-xs text-muted">{meta.actionHint}</p>
				{#if blocked}
					<p class="mt-1.5 flex items-start gap-1.5 text-xs text-warn">
						<svg viewBox="0 0 16 16" class="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true">
							<path
								d="M8 2 L15 14 L1 14 Z"
								fill="none"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linejoin="round"
							/>
							<path
								d="M8 6.5 V9.5 M8 11.5 V11.6"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linecap="round"
							/>
						</svg>
						{blocked}
					</p>
				{:else if outOfOrder}
					<p class="mt-1.5 text-xs text-subtle">
						You have skipped ahead. Doing this now marks everything before it as done too.
					</p>
				{:else}
					<p class="mt-1.5 text-xs text-subtle">Unlocks {meta.reveals}.</p>
				{/if}
			</div>
			<button type="button" class="btn btn-primary h-11 px-5" disabled={!!blocked} onclick={act}>
				{meta.action}
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
		</div>
	{/if}
</section>
