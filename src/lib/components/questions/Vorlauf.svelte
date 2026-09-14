<script lang="ts">
	/**
	 * What do you do with the first jug?
	 *
	 * Two cards, and the second is what a beginner does without knowing there
	 * was a choice. The consequence on each card is from a run of the model:
	 * the haze the flour leaves and the tannin the husk gives up in the kettle.
	 */
	import { hazeFor } from '$lib/brewing/appearance';
	import { buildContext } from '$lib/brewing/simulate';
	import { DEFAULTS } from '$lib/brewing/recipes';
	import { brew } from '$lib/state/brew.svelte';

	const OPTIONS: { value: boolean; name: string; what: string }[] = [
		{
			value: true,
			name: 'Pour it back over the grain',
			what: 'The cloudy first litre goes gently back on top. The grain bed settles into a filter, and within a few minutes what comes out of the tap runs clear. Five minutes, and nobody skips it twice.'
		},
		{
			value: false,
			name: 'Straight to the kettle',
			what: 'Collect from the first drop. The flour and husk fragments boil for an hour with the wort, and some of what they give up never leaves the beer.'
		}
	];

	const chosen = $derived(brew.recipe.mash.vorlauf ?? true);

	const perOption = $derived.by(() => {
		const out: Record<string, { haze: number; astringency: number }> = {};
		for (const o of OPTIONS) {
			const recipe = { ...brew.recipe, mash: { ...brew.recipe.mash, vorlauf: o.value } };
			const ctx = buildContext(recipe);
			out[String(o.value)] = { haze: hazeFor(recipe), astringency: ctx?.risks.astringency ?? 0 };
		}
		return out;
	});

	const hazeWord = (h: number) =>
		h < 0.15 ? 'brilliantly clear' : h < 0.35 ? 'slightly hazy' : h < 0.6 ? 'hazy' : 'opaque';
</script>

<ul class="grid gap-2 sm:grid-cols-2">
	{#each OPTIONS as option (String(option.value))}
		{@const selected = chosen === option.value}
		{@const effect = perOption[String(option.value)]}
		<li>
			<button
				type="button"
				class="h-full w-full rounded-lg p-3 text-start ring-1 {selected
					? 'bg-copper-dim ring-copper'
					: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
				aria-pressed={selected}
				onclick={() => (brew.recipe.mash.vorlauf = option.value)}
			>
				<span class="flex items-baseline justify-between gap-2">
					<span class="text-sm font-medium">{option.name}</span>
					{#if selected && option.value === (DEFAULTS.mash.vorlauf ?? true)}
						<span class="text-[0.625rem] tracking-wide text-fg/70 uppercase">default</span>
					{/if}
				</span>
				<span class="mt-0.5 block text-xs {selected ? 'text-fg' : 'text-subtle'}"
					>{option.what}</span
				>
				{#if effect}
					<span class="mt-1.5 block text-xs {selected ? 'text-fg' : 'text-muted'}">
						Pours {hazeWord(effect.haze)} · drying grip
						<span class="tnum">{effect.astringency.toFixed(1)}/10</span>
					</span>
				{/if}
			</button>
		</li>
	{/each}
</ul>
