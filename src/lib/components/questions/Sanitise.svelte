<script lang="ts">
	/**
	 * How clean is everything the beer will touch?
	 *
	 * The step most first batches go wrong on, and until now the one thing on
	 * a brew day the model did not know about. Four ways of dealing with the
	 * kit, each a real thing people do, each with what it does to this beer on
	 * the card — the contamination risk from a run of the model, and for
	 * bleach the medicinal note it leaves if the rinse afterwards is ordinary.
	 */
	import { buildContext } from '$lib/brewing/simulate';
	import { FAULT_THRESHOLD } from '$lib/brewing/faults';
	import { DEFAULTS } from '$lib/brewing/recipes';
	import { brew } from '$lib/state/brew.svelte';
	import type { Sanitation } from '$lib/brewing/types';

	const OPTIONS: { value: Sanitation; name: string; what: string }[] = [
		{
			value: 'rinse',
			name: 'A rinse under the hot tap',
			what: 'It looks clean. Whatever the last batch left behind — in the scratches, under the lid seal, inside the tubing — is still there, and it has a two-day head start on your yeast.'
		},
		{
			value: 'boiling',
			name: 'Boiling water over everything',
			what: 'Kills most of what is on a surface it actually reaches. It does not reach the inside of the siphon tube or the airlock, and it cools before it has finished the job.'
		},
		{
			value: 'no-rinse',
			name: 'A no-rinse sanitiser',
			what: 'Star San or the like: a two-minute soak that kills what a rinse cannot, and the foam left behind is harmless to the beer. What every experienced homebrewer does, and it costs a few pence a batch.'
		},
		{
			value: 'bleach',
			name: 'Bleach, then rinse',
			what: 'Kills everything. Then you rinse it off with water that is not sterile, and any trace left on the kit meets the beer and tastes of antiseptic. Effective if you are thorough; a gamble if you are not.'
		}
	];

	const chosen = $derived(brew.recipe.chill.sanitation ?? 'no-rinse');

	/** What each choice does to this beer, so the cards can be compared. */
	const perOption = $derived.by(() => {
		const out: Record<string, { infection: number; medicinal: boolean }> = {};
		for (const o of OPTIONS) {
			const ctx = buildContext({
				...brew.recipe,
				chill: { ...brew.recipe.chill, sanitation: o.value }
			});
			if (ctx) {
				out[o.value] = {
					infection: ctx.risks.infection,
					medicinal: ctx.risks.chlorophenol > FAULT_THRESHOLD.chlorophenol
				};
			}
		}
		return out;
	});

	const word = (v: number) => (v < 3 ? 'low' : v < 6 ? 'moderate' : 'high');
</script>

<ul class="grid gap-2 sm:grid-cols-2">
	{#each OPTIONS as option (option.value)}
		{@const selected = chosen === option.value}
		{@const effect = perOption[option.value]}
		<li>
			<button
				type="button"
				class="h-full w-full rounded-lg p-3 text-start ring-1 {selected
					? 'bg-copper-dim ring-copper'
					: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
				aria-pressed={selected}
				onclick={() => (brew.recipe.chill.sanitation = option.value)}
			>
				<span class="flex items-baseline justify-between gap-2">
					<span class="text-sm font-medium">{option.name}</span>
					{#if selected && option.value === DEFAULTS.chill.sanitation}
						<span class="text-[0.625rem] tracking-wide text-fg/70 uppercase">default</span>
					{/if}
				</span>
				<span class="mt-0.5 block text-xs {selected ? 'text-fg' : 'text-subtle'}"
					>{option.what}</span
				>
				{#if effect}
					<span class="mt-1.5 block text-xs {selected ? 'text-fg' : 'text-muted'}">
						Contamination risk <span class="tnum">{effect.infection.toFixed(1)}/10</span> ·
						{word(effect.infection)}{effect.medicinal ? ' · a medicinal note likely' : ''}
					</span>
				{/if}
			</button>
		</li>
	{/each}
</ul>
