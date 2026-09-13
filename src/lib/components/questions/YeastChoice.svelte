<script lang="ts">
	/**
	 * Which yeast?
	 *
	 * The strains on offer, grouped by what they are, and what the chosen one
	 * does to the beer.
	 */
	import LearningNote from '../LearningNote.svelte';
	import { YEASTS, getYeast } from '$lib/brewing/ingredients';
	import { brew } from '$lib/state/brew.svelte';

	const chosenYeast = $derived(getYeast(brew.recipe.fermentation.yeastId));

	const byKind = $derived([
		{ kind: 'ale' as const, label: 'Ale', yeasts: YEASTS.filter((y) => y.kind === 'ale') },
		{ kind: 'lager' as const, label: 'Lager', yeasts: YEASTS.filter((y) => y.kind === 'lager') },
		{
			kind: 'wild' as const,
			label: 'Wild and mixed',
			yeasts: YEASTS.filter((y) => y.kind === 'wild')
		}
	]);
</script>

<section>
	<div class="flex flex-col gap-3">
		{#each byKind as group (group.kind)}
			<div>
				<p class="mb-1.5 text-xs text-subtle">{group.label}</p>
				<div class="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
					{#each group.yeasts as option (option.id)}
						{@const selected = option.id === brew.recipe.fermentation.yeastId}
						<button
							type="button"
							class="rounded-lg p-2.5 text-start ring-1
								{selected
								? 'bg-copper-dim ring-copper'
								: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
							aria-pressed={selected}
							onclick={() => (brew.recipe.fermentation.yeastId = option.id)}
						>
							<span class="flex items-baseline justify-between gap-2">
								<span class="text-sm font-medium">{option.name}</span>
								<span class="tnum text-xs {selected ? 'text-fg' : 'text-muted'}">
									{Math.round(option.attenuation * 100)}%
								</span>
							</span>
							<span class="mt-0.5 block text-xs {selected ? 'text-fg' : 'text-subtle'}"
								>{option.blurb}</span
							>
							<span class="tnum mt-1 block text-[0.625rem] {selected ? 'text-fg' : 'text-subtle'}">
								{option.tempMinC}–{option.tempMaxC} °C · {option.flocculation} flocculation
							</span>
						</button>
					{/each}
				</div>
			</div>
		{/each}
	</div>
	{#if chosenYeast}
		<LearningNote why={chosenYeast.note} />
	{/if}
</section>
