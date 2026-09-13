<script lang="ts">
	/**
	 * Where you are across the whole brew day, at a glance.
	 *
	 * One dot per question, grouped under the stage it belongs to. The stage
	 * names are landmarks rather than destinations — they tell you that the
	 * question on screen is part of the mash, not that the mash is a place you
	 * navigate to and fill in.
	 */
	import { brew } from '$lib/state/brew.svelte';
	import { QUESTIONS, reachableThrough } from '$lib/state/questions';
	import { STAGES, stageIndex } from '$lib/state/stages';

	const limit = $derived(reachableThrough(brew.brewedTo));

	const groups = $derived(
		STAGES.map((stage) => ({
			stage,
			questions: QUESTIONS.map((q, index) => ({ q, index })).filter((e) => e.q.stage === stage.id)
		})).filter((g) => g.questions.length > 0)
	);
</script>

<nav aria-label="Brew day" class="border-b border-line bg-surface-2/80 backdrop-blur-sm">
	<ol
		class="mx-auto flex max-w-[100rem] snap-x [scrollbar-width:thin] items-end gap-3 overflow-x-auto px-3 py-2 sm:gap-4 sm:px-5"
	>
		{#each groups as group (group.stage.id)}
			{@const done = stageIndex(group.stage.id) <= brew.brewedTo}
			{@const here = group.questions.some((e) => e.index === brew.at)}
			<li class="flex shrink-0 snap-start flex-col gap-1">
				<span
					class="text-[0.625rem] font-medium tracking-wide uppercase {here
						? 'text-copper-text'
						: done
							? 'text-muted'
							: 'text-subtle'}"
				>
					{group.stage.name}
				</span>
				<div class="flex items-center gap-1">
					{#each group.questions as entry (entry.q.id)}
						{@const current = entry.index === brew.at}
						{@const reachable = entry.index <= limit}
						<button
							type="button"
							class="grid h-6 w-6 place-items-center rounded-full transition-colors {current
								? 'bg-copper'
								: reachable
									? 'hover:bg-ui-hover'
									: 'cursor-default'}"
							disabled={!reachable}
							aria-current={current ? 'step' : undefined}
							onclick={() => brew.goTo(entry.index)}
						>
							<span
								class="block rounded-full {current
									? 'h-2.5 w-2.5 bg-ink'
									: entry.index < brew.at
										? 'h-2 w-2 bg-hop'
										: reachable
											? 'h-2 w-2 bg-line-strong'
											: 'h-1.5 w-1.5 bg-line'}"
								aria-hidden="true"
							></span>
							<span class="sr-only">
								{group.stage.name}: {entry.q.ask}
								{entry.index < brew.at ? '(answered)' : reachable ? '' : '(not reached yet)'}
							</span>
						</button>
					{/each}
				</div>
			</li>
		{/each}
	</ol>
</nav>
