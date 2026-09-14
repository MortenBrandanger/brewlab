<script lang="ts">
	/**
	 * How much yeast goes in?
	 *
	 * This used to be a three-way toggle in the corner of the temperature
	 * screen, which made it look like a setting. It is a decision with a
	 * physical act behind it — one sachet, two, or a jar of starter made the day
	 * before — and the model treats it as one: the pitch sets how much growing
	 * the yeast has to do before it can start on the sugar, and yeast that is
	 * busy multiplying makes fruit and hot alcohol on the way.
	 */
	import { brew } from '$lib/state/brew.svelte';
	import { DEFAULTS } from '$lib/brewing/recipes';
	import { buildContext, simulate } from '$lib/brewing/simulate';
	import { describeIntensity } from '$lib/brewing/sensory';
	import { FAULT_THRESHOLD } from '$lib/brewing/faults';
	import type { PitchRate } from '$lib/brewing/types';

	const OPTIONS: { value: PitchRate; name: string; what: string }[] = [
		{
			value: 'under',
			name: 'One packet, straight in',
			what: 'A single sachet of dry yeast sprinkled on top. Enough for a small or ordinary beer; on a strong wort it is a tired start, and the cells have to multiply many times over before they get to the sugar.'
		},
		{
			value: 'standard',
			name: 'A healthy pitch',
			what: 'Enough cells for the gravity — two sachets, or one rehydrated properly in warm water first. What the instructions on the packet quietly assume you did.'
		},
		{
			value: 'over',
			name: 'A starter',
			what: 'Yeast grown up in a jar of wort a day or two ahead, or several packets. It gets to work within hours and has less growing to do, so it makes less fruit and finishes cleaner.'
		}
	];

	/**
	 * What each pitch would do to this beer, so the cards can be compared
	 * rather than believed. The pitch barely changes how fast the beer
	 * finishes — the yeast reaches its ceiling within a day or two whatever
	 * went in — so the honest consequence is what the growing yeast made on
	 * the way: fruit, and heat.
	 */
	const perOption = $derived.by(() => {
		const out: Record<string, { fruit: string; heat: string }> = {};
		if (!brew.recipe.fermentation.yeastId) return out;
		for (const o of OPTIONS) {
			const recipe = {
				...brew.recipe,
				fermentation: { ...brew.recipe.fermentation, pitchRate: o.value }
			};
			const fusel = buildContext(recipe)?.risks.fusel ?? 0;
			out[o.value] = {
				fruit: describeIntensity(simulate(recipe).sensory.fruitEsters),
				heat:
					fusel > FAULT_THRESHOLD.fusel
						? 'hot alcohol likely'
						: fusel > 2
							? 'a little warmth'
							: 'no heat'
			};
		}
		return out;
	});

	/** A clean strain on an ordinary wort lands the same however much goes in; say so. */
	const allAlike = $derived.by(() => {
		const v = Object.values(perOption);
		return (
			v.length === OPTIONS.length && v.every((e) => e.fruit === v[0].fruit && e.heat === v[0].heat)
		);
	});
</script>

<div class="flex flex-col gap-3">
	<ul class="grid gap-2 sm:grid-cols-3">
		{#each OPTIONS as option (option.value)}
			{@const selected = brew.recipe.fermentation.pitchRate === option.value}
			{@const effect = perOption[option.value]}
			<li>
				<button
					type="button"
					class="h-full w-full rounded-lg p-3 text-start ring-1 {selected
						? 'bg-copper-dim ring-copper'
						: 'bg-surface ring-line hover:bg-ui-hover hover:ring-line-strong'}"
					aria-pressed={selected}
					onclick={() => (brew.recipe.fermentation.pitchRate = option.value)}
				>
					<span class="flex items-baseline justify-between gap-2">
						<span class="text-sm font-medium">{option.name}</span>
						{#if selected && option.value === DEFAULTS.fermentation.pitchRate}
							<span class="text-[0.625rem] tracking-wide text-fg/70 uppercase">default</span>
						{/if}
					</span>
					<span class="mt-0.5 block text-xs {selected ? 'text-fg' : 'text-subtle'}">
						{option.what}
					</span>
					{#if effect}
						<span class="mt-1.5 block text-xs {selected ? 'text-fg' : 'text-muted'}">
							{effect.fruit.charAt(0).toUpperCase() + effect.fruit.slice(1)} fruit from the yeast ·
							{effect.heat}
						</span>
					{/if}
				</button>
			</li>
		{/each}
	</ul>
	{#if allAlike}
		<p class="prose-measure text-xs text-subtle">
			For this yeast on this wort the three land the same in the glass. The pitch matters most on a
			strong wort or with a fruity strain; here it mostly decides how soon the bubbling starts.
		</p>
	{/if}
</div>
